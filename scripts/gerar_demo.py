"""Gera dados/demo/docentes-demo.json (30 perfis FICTICIOS para demonstracao e testes).

Uso, a partir da raiz do repositorio:  python3 scripts/gerar_demo.py
Os nomes sao inventados. O script confere que nenhum coincide com a lista publica
dados/docentes-sigaa.json (nome completo, ou primeiro mais ultimo nome).
"""
import json, datetime, os
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M='Marabá (Campus Sede)'; C='Canaã dos Carajás'; X='Xinguara'; R='Rondon do Pará'; S='São Félix do Xingu'; A='Santana do Araguaia'
P='Presencial'; T='TV ou vídeo'; Ra='Rádio ou áudio'; E='E-mail'
def f(n,c,a): return {'nivel':n,'curso':c,'instituicao':'Instituição de demonstração','ano':str(a)}
D=[
# Saúde pública
('Helena Maria Corvello Ribas','Saúde',M,'Epidemiologia de doenças transmitidas por mosquitos na Amazônia, com foco em dengue, malária e febre amarela. Analisa a relação entre chuvas, desmatamento e casos notificados e orienta municípios sobre vigilância e prevenção.',['dengue','malária','vigilância epidemiológica','saúde pública'],[P,T,Ra,E],[f('Doutorado','Saúde Coletiva',2014),f('Mestrado','Epidemiologia',2009)]),
('Otávio Benedito Lanzoni','Saúde',M,'Pesquisa o acesso aos serviços de saúde em municípios do sul e sudeste do Pará, com atenção à atenção primária, ao saneamento básico e à qualidade da água de abastecimento.',['atenção primária','saneamento','água potável','saúde pública'],[P,Ra,E],[f('Doutorado','Saúde Coletiva',2017),f('Especialização','Gestão em Saúde',2011)]),
('Rosimeire Tavares Bandeira','Saúde',X,'Atua em nutrição e segurança alimentar de comunidades rurais, estudando alimentação escolar, hortas comunitárias e o consumo de alimentos regionais como castanha e açaí.',['segurança alimentar','nutrição','alimentação escolar','agricultura familiar'],[P,T,E],[f('Mestrado','Nutrição',2012),f('Graduação','Nutrição',2007)]),
('Gilberto Aurélio Sampaio Neto','Saúde',C,'Estuda a saúde do trabalhador em atividades de mineração e construção, incluindo doenças respiratórias, ruído e acidentes, e propõe medidas de prevenção para empresas e sindicatos.',['saúde do trabalhador','doenças respiratórias','acidentes de trabalho','mineração'],[P,E],[f('Doutorado','Saúde Coletiva',2016),f('Graduação','Fisioterapia',2008)]),
# Educação
('Marlene Cristina Duarte Ferraz','Educação',M,'Pesquisa o ensino de matemática nos anos finais do ensino fundamental, formação de professores e o uso de jogos e materiais concretos para reduzir a evasão escolar.',['ensino de matemática','formação de professores','evasão escolar','educação básica'],[P,Ra,E],[f('Doutorado','Educação Matemática',2013),f('Mestrado','Educação',2008)]),
('Wellington Augusto Peixoto Leal','Educação',R,'Estuda a educação do campo e as escolas rurais da região, em especial a pedagogia da alternância, o transporte escolar e a permanência de jovens do campo no ensino médio.',['educação do campo','pedagogia da alternância','escolas rurais','juventude rural'],[P,T,E],[f('Mestrado','Educação',2015),f('Graduação','Pedagogia',2009)]),
('Íris Valentina Quaresma Dória','Educação',M,'Investiga a alfabetização e o letramento de crianças, o desempenho em leitura e as políticas públicas de educação infantil, com apoio a redes municipais de ensino.',['alfabetização','letramento','educação infantil','políticas educacionais'],[P,Ra,E],[f('Doutorado','Educação',2018),f('Graduação','Pedagogia',2006)]),
('Cláudio Henrique Mourão Santiago','Educação',S,'Trabalha com educação escolar indígena e interculturalidade, formação de professores indígenas e valorização das línguas e dos saberes tradicionais nas escolas.',['educação indígena','interculturalidade','línguas indígenas','formação de professores'],[P,T,E],[f('Mestrado','Educação',2013),f('Graduação','Letras',2007)]),
# Mineração e geologia
('Teodoro Alencar Brandão Filho','Geociências',C,'Pesquisa a geologia de depósitos de cobre e ouro da província mineral de Carajás, métodos de prospecção e a caracterização de rochas e minérios.',['geologia','mineração','cobre','prospecção mineral'],[P,T,E],[f('Doutorado','Geologia',2012),f('Graduação','Geologia',2005)]),
('Verônica Sales Camargo Prado','Geociências',M,'Estuda os impactos ambientais da mineração, como rejeitos, barragens e contaminação de rios por metais, e a recuperação de áreas degradadas.',['impactos da mineração','barragens de rejeito','recuperação de áreas degradadas','metais pesados'],[P,T,Ra,E],[f('Doutorado','Engenharia Ambiental',2015),f('Mestrado','Geoquímica',2010)]),
('Anselmo Rufino Cavalcante Lyra','Engenharia',M,'Atua em engenharia de minas, estabilidade de taludes e segurança em lavra a céu aberto, além do aproveitamento de resíduos da mineração na construção civil.',['engenharia de minas','estabilidade de taludes','resíduos de mineração','construção civil'],[P,E],[f('Doutorado','Engenharia Mineral',2011),f('Graduação','Engenharia de Minas',2004)]),
('Débora Letícia Nogueira Aragão','Ciências Sociais',C,'Analisa os efeitos sociais da expansão mineral sobre cidades da região, como migração, habitação, preços de aluguel e a economia local dependente de grandes empreendimentos.',['expansão mineral','desenvolvimento regional','migração','economia local'],[P,T,Ra,E],[f('Doutorado','Sociologia',2016),f('Mestrado','Desenvolvimento Regional',2011)]),
# Agropecuária e pesca
('Ernesto Vilela Magalhães Couto','Agrárias',X,'Pesquisa a pecuária de corte na Amazônia, o manejo de pastagens degradadas, a recuperação de pasto e sistemas que integram lavoura, pecuária e floresta.',['pecuária','pastagens','integração lavoura-pecuária-floresta','manejo de solo'],[P,Ra,E],[f('Doutorado','Zootecnia',2014),f('Graduação','Agronomia',2006)]),
('Luzia Aparecida Freire Montenegro','Agrárias',A,'Estuda a pesca artesanal nos rios Araguaia e Tocantins, o manejo de pescado, o período de defeso e a renda de comunidades ribeirinhas.',['pesca artesanal','defeso','pescado','comunidades ribeirinhas'],[P,T,Ra,E],[f('Doutorado','Recursos Pesqueiros',2013),f('Mestrado','Aquicultura',2008)]),
('Joaquim Nunes Bittencourt Reis','Agrárias',M,'Trabalha com piscicultura em tanques escavados, nutrição de espécies nativas, qualidade da água de cultivo e viabilidade econômica de pequenos produtores.',['piscicultura','aquicultura','tambaqui','qualidade da água'],[P,E],[f('Mestrado','Aquicultura',2016),f('Graduação','Engenharia de Pesca',2010)]),
('Sônia Regina Amaral Villas Boas','Agrárias',R,'Pesquisa agroecologia e sistemas agroflorestais com cacau, açaí e cupuaçu, o uso de adubação orgânica e a comercialização da agricultura familiar.',['agroecologia','sistemas agroflorestais','cacau','agricultura familiar'],[P,T,E],[f('Doutorado','Agronomia',2015),f('Mestrado','Agroecologia',2010)]),
# Ciências sociais, direito
('Fabrício Gaspar Leão Medeiros','Direito',M,'Estuda conflitos agrários, regularização fundiária e violência no campo no sul e sudeste do Pará, com atuação junto a movimentos sociais e defensorias.',['conflitos agrários','regularização fundiária','direitos humanos','violência no campo'],[P,T,Ra,E],[f('Doutorado','Direito',2017),f('Mestrado','Direito Agrário',2011)]),
('Nathália Rocha Siqueira Jardim','Ciências Sociais',M,'Pesquisa povos e comunidades tradicionais, territórios quilombolas e consulta prévia, livre e informada, com ênfase em direitos territoriais e memória.',['quilombolas','comunidades tradicionais','consulta prévia','direitos territoriais'],[P,T,E],[f('Doutorado','Antropologia',2018),f('Graduação','Ciências Sociais',2010)]),
('Raimundo Délio Cordeiro Pessoa','Ciências Sociais',S,'Investiga a história da ocupação da Amazônia, migrações e a formação das cidades do sudeste do Pará, com uso de arquivos, relatos orais e cartografia histórica.',['história regional','migrações','história oral','ocupação da Amazônia'],[P,Ra,E],[f('Doutorado','História',2012),f('Mestrado','História Social',2007)]),
('Camila Esperança Tostes Lobão','Direito',C,'Atua em direito ambiental e licenciamento, responsabilidade por danos ambientais e participação social em audiências públicas de grandes empreendimentos.',['direito ambiental','licenciamento ambiental','danos ambientais','participação social'],[P,E],[f('Mestrado','Direito Ambiental',2014),f('Graduação','Direito',2008)]),
# Computação e dados
('Leandro Pimentel Borges Guedes','Computação',M,'Pesquisa aprendizagem de máquina e processamento de linguagem natural, com aplicações em textos públicos, e discute vieses e limites de sistemas de inteligência artificial.',['inteligência artificial','aprendizagem de máquina','processamento de linguagem natural','ética em dados'],[P,T,Ra,E],[f('Doutorado','Ciência da Computação',2016),f('Mestrado','Informática',2011)]),
('Priscila Andrade Moreira Colares','Computação',M,'Atua em engenharia de software e sistemas de informação para o setor público, testes de software, acessibilidade e desenvolvimento de aplicações web.',['engenharia de software','acessibilidade','sistemas web','testes de software'],[P,E],[f('Mestrado','Ciência da Computação',2015),f('Graduação','Sistemas de Informação',2009)]),
('Heitor Gonçalves Vasconcelos Dantas','Matemática e Estatística',X,'Trabalha com estatística aplicada e análise de dados, séries temporais de chuva e temperatura, visualização de dados e comunicação de números para o público leigo.',['estatística','análise de dados','visualização de dados','séries temporais'],[P,Ra,E],[f('Doutorado','Estatística',2017),f('Graduação','Matemática',2009)]),
# Engenharia e energia
('Adriana Pacheco Lemos Tenório','Engenharia',A,'Pesquisa recursos hídricos, hidrologia de bacias amazônicas, cheias e secas do rio Araguaia e o planejamento do uso da água em cidades pequenas.',['recursos hídricos','hidrologia','cheias e secas','bacias hidrográficas'],[P,T,Ra,E],[f('Doutorado','Engenharia Civil',2013),f('Mestrado','Recursos Hídricos',2008)]),
('Bernardo Cássio Wanderley Pinto','Engenharia',M,'Estuda energia solar fotovoltaica e eficiência energética em prédios públicos, além de microrredes para comunidades isoladas sem acesso regular à eletricidade.',['energia solar','eficiência energética','microrredes','energias renováveis'],[P,T,E],[f('Doutorado','Engenharia Elétrica',2015),f('Graduação','Engenharia Elétrica',2007)]),
('Ivone Maria Santarém Falcão','Engenharia',C,'Atua em engenharia civil e materiais de construção, uso de resíduos em concreto, patologias de edificações e habitação de interesse social.',['materiais de construção','concreto','habitação de interesse social','engenharia civil'],[P,E],[f('Mestrado','Engenharia Civil',2012),f('Graduação','Engenharia Civil',2006)]),
# Biologia e clima
('Cecília Marques Albuquerque Seixas','Biologia',M,'Pesquisa a biodiversidade de florestas e savanas do sudeste do Pará, aves e mamíferos, e os efeitos da fragmentação do habitat sobre a fauna.',['biodiversidade','fauna','fragmentação florestal','conservação'],[P,T,Ra,E],[f('Doutorado','Ecologia',2014),f('Graduação','Ciências Biológicas',2007)]),
('Maurício Evangelista Tolentino Cruz','Biologia',R,'Estuda queimadas, incêndios florestais e mudanças climáticas na Amazônia, o monitoramento por satélite do desmatamento e a restauração de florestas.',['queimadas','mudanças climáticas','desmatamento','restauração florestal'],[P,T,Ra,E],[f('Doutorado','Ciências Ambientais',2016),f('Mestrado','Ciências Florestais',2011)]),
('Aline Beatriz Fontenele Cordovil','Biologia',S,'Pesquisa plantas medicinais e saberes de comunidades locais, a conservação de espécies nativas e o cultivo de ervas e frutíferas em quintais agroflorestais.',['plantas medicinais','etnobotânica','espécies nativas','quintais agroflorestais'],[P,E],[f('Mestrado','Botânica',2015),f('Graduação','Ciências Biológicas',2010)]),
('Estela Maris Quintanilha Brito','Ciências Sociais',X,'Estuda a economia regional, o mercado de trabalho e o comércio em cidades do interior do Pará, o microcrédito e o empreendedorismo de mulheres e jovens.',['economia regional','mercado de trabalho','microcrédito','empreendedorismo'],[P,Ra,E],[f('Mestrado','Economia',2014),f('Graduação','Ciências Econômicas',2008)]),
]
assert len(D)==30
docs=[]
for i,(n,u,c,r,t,fm,fo) in enumerate(D,1):
    docs.append({'id':f'demo-{i:02d}','ficticio':True,'nome':n,'unidade':f'Unidade de demonstração: {u}','campus':c,'resumo':r,'temas':t,'formatos':fm,'lattes':'','formacoes':fo})
out={'ficticio':True,'aviso':'DADOS FICTÍCIOS para demonstração e testes. Nomes, perfis e formações foram inventados e não descrevem docentes da Unifesspa.','total':len(docs),'gerado_em':datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'),'docentes':docs}
json.dump(out,open(os.path.join(RAIZ,'dados','demo','docentes-demo.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=2)
# checagens
import collections,re,unicodedata
def norm(s): return unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower()
print(collections.Counter(d['campus'] for d in docs))
txt=' '.join(norm(' '.join([d['nome'],d['resumo'],' '.join(d['temas'])])) for d in docs)
for w in ['peixe','astronom','pesca','pescado','dengue','mineracao']: print(w, txt.count(w))
print('nomes unicos',len({d['nome'] for d in docs}))
# colisão com lista SIGAA pública (só contagem)
s=json.load(open(os.path.join(RAIZ,'dados','docentes-sigaa.json'),encoding='utf-8'))['docentes']
real=[norm(x['nome']).split() for x in s]
full={' '.join(x) for x in real}
fl={(x[0],x[-1]) for x in real if x}
c1=sum(1 for d in docs if norm(d['nome']) in full)
c2=sum(1 for d in docs if (norm(d['nome']).split()[0],norm(d['nome']).split()[-1]) in fl)
print('colisao nome completo',c1,'primeiro+ultimo',c2)
