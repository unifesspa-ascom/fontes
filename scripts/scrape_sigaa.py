#!/usr/bin/env python3
"""
Scraper de docentes do SIGAA da UNIFESSPA.
Gera dados/docentes-sigaa.json com a lista de docentes ativos.
Roda via GitHub Actions diariamente.
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import os
from datetime import datetime, timezone

BASE_URL = "https://sigaa.unifesspa.edu.br/sigaa/public/docente/busca_docentes.jsf"
PARAMS = {"aba": "p-academico"}
OUTPUT = "dados/docentes-sigaa.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ASCOM-UNIFESSPA-Bot/1.0; +https://unifesspa-ascom.github.io)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "pt-BR,pt;q=0.9",
}


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

    print("Buscando página inicial...")
    resp = session.get(BASE_URL, params=PARAMS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    departments = get_departments(soup)
    print(f"Encontrados {len(departments)} departamentos")

    if not departments:
        print("ERRO: Nenhum departamento encontrado. Verifique o HTML do SIGAA.")
        return 0

    all_professors = {}

    for dept_id, dept_name in departments:
        print(f"  Buscando: {dept_name[:70]}...")
        try:
            resp = session.get(BASE_URL, params=PARAMS, timeout=30)
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

            resp = session.post(BASE_URL, data=post_data, timeout=30)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            profs = parse_professors(soup)
            print(f"    -> {len(profs)} docentes encontrados")

            for prof in profs:
                siape = prof["siape"]
                if siape and siape not in all_professors:
                    all_professors[siape] = prof

            time.sleep(0.5)

        except Exception as e:
            print(f"    ERRO ao buscar {dept_name[:40]}: {e}")
            continue

    prof_list = sorted(all_professors.values(), key=lambda p: p["nome"])

    output = {
        "atualizado": datetime.now(timezone.utc).isoformat(),
        "total": len(prof_list),
        "docentes": prof_list,
    }

    os.makedirs("dados", exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nSalvos {len(prof_list)} docentes em {OUTPUT}")
    return len(prof_list)


if __name__ == "__main__":
    count = scrape_all()
    print(f"Concluído: {count} docentes encontrados.")
