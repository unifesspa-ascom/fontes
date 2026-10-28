# Dados de demonstração (fictícios)

Os 30 perfis de `docentes-demo.json` são inventados. Os nomes, os resumos, os temas e as formações
não descrevem docentes da Unifesspa. Servem para desenvolver e testar a busca e as análises
(TF-IDF, agrupamento) enquanto o cadastro voluntário não tem perfis reais suficientes.

- Não misturar com `docentes-cadastrados.json`, que é o arquivo do site real.
- Resultados obtidos com estes dados provam o método e não descrevem o acervo real.
- A página de demonstração está em `/demo/` e tem aviso de dados fictícios.

Características deliberadas (para os casos de teste):
- Nenhum perfil usa a palavra "peixe". Há "pesca artesanal", "pescado" e "piscicultura", para testar sinônimos.
- Nenhum perfil trata de astronomia, para testar uma busca sem resultado esperado.
- Há nove áreas temáticas (saúde, educação, mineração, agropecuária e pesca, ciências sociais e direito,
  computação e dados, engenharia e energia, biologia e clima, economia), com 2 a 5 perfis cada.
- Os campi têm quantidades diferentes de perfis (Marabá 13, Canaã dos Carajás 5, Xinguara 4,
  Rondon do Pará 3, São Félix do Xingu 3, Santana do Araguaia 2).
