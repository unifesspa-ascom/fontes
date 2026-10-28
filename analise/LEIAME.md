# Análise temática dos perfis (conjunto de demonstração)

**Os dados analisados aqui são FICTÍCIOS** (`dados/demo/docentes-demo.json`, 30 perfis inventados). Os resultados mostram se o método funciona e quais são seus limites. Eles não descrevem o acervo real de fontes da Unifesspa.

- `analise_perfis_demo.ipynb`: caderno para o Google Colab (pré-processamento, TF-IDF, K-Means, índice de silhueta, gráficos). Já está executado, com os resultados. Lê os dados do endereço público do repositório.
- `figuras/`: gráficos gerados pelo caderno.
- `tabela_grupos.csv`, `tabela_sensibilidade.csv`, `perfis_por_grupo.csv`: tabelas geradas pelo caderno.

Resultado principal: com 9 grupos, o índice de silhueta foi 0,116 (abaixo de 0,25, sem estrutura substancial). A comparação com as áreas inventadas deu índice de Rand ajustado de 0,48. A análise deve ser refeita com os cadastros reais.
