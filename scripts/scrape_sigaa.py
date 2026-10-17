#!/usr/bin/env python3
"""
Scraper de docentes do SIGAA da UNIFESSPA.
Gera dados/docentes-sigaa.json com a lista de docentes ativos.
Roda via GitHub Actions diariamente.

IMPORTANTE: O SIGAA da UNIFESSPA pode bloquear IPs externos (como os do GitHub Actions).
Se isso acontecer, o script termina com código 0 e mantém o JSON anterior intacto.
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import os
import sys
from datetime import datetime, timezone

BASE_URL = "https://sigaa.unifesspa.edu.br/sigaa/public/docente/busca_docentes.jsf"
PARAMS = {"aba": "p-academico"}
OUTPUT = "dados/docentes-sigaa.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
    "Connection": "keep-alive",
}
CONNECT_TIMEOUT = 60   # segundos para conectar
READ_TIMEOUT = 90      # segundos para ler resposta


def get_view_state(soup):
    vs = soup.find("input", {"name": "javax.faces.ViewState"})
    return vs["value"] if vs else "j_id6"


def get_departments(soup):
    select = soup.find("select", {"name": "form:departamento"})
    if not select:
        return []
    return [
        (opt["value"], opt.get_text(strip=True))
        for opt in select.find_all("option")
        if opt.get("value", "0") != "0"
    ]


def parse_professors(soup):
    professors = []
    for link in soup.find_all("a", href=lambda h: h and "siape=" in h):
        siape = link["href"].split("siape=")[-1].split("&")[0].strip()
        row = link.find_parent("tr")
        if not row:
            continue
        texts = [
            t.strip()
            for t in row.stripped_strings
            if t.strip() and t.strip().lower() != "ver página pública"
        ]
        if len(texts) >= 2:
            professors.append({
                "nome": texts[0].upper().strip(),
                "unidade": texts[1].upper().strip(),
                "siape": siape,
            })
    return professors


def scrape_all():
    session = requests.Session()
    session.headers.update(HEADERS)

    print("Conectando ao SIGAA...")
    try:
        resp = session.get(
            BASE_URL, params=PARAMS,
            timeout=(CONNECT_TIMEOUT, READ_TIMEOUT)
        )
        resp.raise_for_status()
    except requests.exceptions.ConnectTimeout:
        print("AVISO: Timeout ao conectar no SIGAA. O servidor pode estar bloqueando este IP.")
        print("Mantendo a lista existente sem alterações.")
        return None
    except requests.exceptions.ConnectionError as e:
        print(f"AVISO: Erro de conexão com o SIGAA: {e}")
        print("Mantendo a lista existente sem alterações.")
        return None
    except Exception as e:
        print(f"AVISO: Erro inesperado ao acessar o SIGAA: {e}")
        print("Mantendo a lista existente sem alterações.")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")
    departments = get_departments(soup)
    print(f"Encontrados {len(departments)} departamentos")

    if not departments:
        print("AVISO: Nenhum departamento encontrado. Verifique o HTML do SIGAA.")
        return None

    all_professors = {}

    for dept_id, dept_name in departments:
        print(f"  Buscando: {dept_name[:70]}...")
        try:
            resp = session.get(
                BASE_URL, params=PARAMS,
                timeout=(CONNECT_TIMEOUT, READ_TIMEOUT)
            )
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            view_state = get_view_state(soup)

            post_data = {
                "form": "form",
                "form:nome": "",
                "form:departamento": str(dept_id),
                "form:buscar": "Buscar",
                "javax.faces.ViewState": view_state,
            }

            resp = session.post(
                BASE_URL, data=post_data,
                timeout=(CONNECT_TIMEOUT, READ_TIMEOUT)
            )
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            profs = parse_professors(soup)
            print(f"    -> {len(profs)} docentes encontrados")

            for prof in profs:
                siape = prof["siape"]
                if siape and siape not in all_professors:
                    all_professors[siape] = prof

            time.sleep(1)

        except (requests.exceptions.ConnectTimeout, requests.exceptions.ConnectionError) as e:
            print(f"    AVISO: Timeout/conexão perdida em {dept_name[:40]}: {e}")
            print("    Abortando — SIGAA parece estar bloqueando este IP.")
            return None
        except Exception as e:
            print(f"    ERRO ao buscar {dept_name[:40]}: {e}")
            continue

    return sorted(all_professors.values(), key=lambda p: p["nome"])


if __name__ == "__main__":
    prof_list = scrape_all()

    if prof_list is None:
        # SIGAA inacessível — mantém JSON existente, sai com 0 (sem falhar o workflow)
        print("\nSIGAA não acessível nesta execução. JSON anterior mantido.")
        sys.exit(0)

    output = {
        "atualizado": datetime.now(timezone.utc).isoformat(),
        "total": len(prof_list),
        "docentes": prof_list,
    }

    os.makedirs("dados", exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nSalvos {len(prof_list)} docentes em {OUTPUT}")
    print(f"Concluído: {len(prof_list)} docentes encontrados.")
