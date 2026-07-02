Documento de Requisitos do Produto (PRD)
1. Visão Geral do Produto
1.1 Sumário Executivo
O projeto consiste no desenvolvimento de uma plataforma web de Business Intelligence (BI) privada e customizada. O sistema consumirá dados de duas planilhas automatizadas do Google Drive (atualizadas diariamente às 06:00). A plataforma oferecerá controle de acesso restrito por login e senha, garantindo a segurança dos dados corporativos, e exibirá indicadores e gráficos interativos sem a dependência de ferramentas terceiras como o Power BI.

1.2 Objetivos de Negócio
Privacidade e Segurança: Restringir o acesso a dados estratégicos apenas a usuários autenticados.

Autonomia Tecnológica: Reduzir custos com licenças de softwares de BI proprietários e criar uma identidade visual própria.

Performance: Garantir um carregamento rápido dos dashboards através de uma estratégia de cache de dados.

1.3 Público-Alvo
Diretores, gestores e analistas da empresa que necessitam visualizar indicadores diários para tomada de decisão.

Administrador do Sistema: Responsável por gerenciar os acessos (criar/bloquear usuários).

2. Escopo e Arquitetura Recomendada
2.1 Fora de Escopo (Nesta Versão)
Edição ou inserção de dados nas planilhas de origem através do sistema (o fluxo é estritamente de leitura).

Criação de gráficos dinâmicos pelo próprio usuário (os dashboards serão predefinidos no código).

2.2 Arquitetura de Alto Nível
[ Google Sheets ] 
       │ (Atualização diária às 06:00)
       ▼
[ Rotina Backend (Cron) ] ──(Autenticação via Service Account)
       │ (Executada às 06:15 -> Salva dados em Cache/Banco Local)
       ▼
[ Banco de Dados / Cache Local ] ──(Dados de Login + Dados das Planilhas)
       │
       ▼
[ API Backend ] ──(Valida JWT / Protege Rotas)
       │
       ▼
[ Frontend Web ] ──(Tela de Login + Dashboards Interativos)
3. Requisitos Funcionais (RF)
RF01: Autenticação e Controle de Acesso
RF01.1: O sistema deve apresentar uma tela de login inicial. Nenhuma página interna pode ser acessada sem autenticação.

RF01.2: O login deve ser feito via e-mail e senha criptografada.

RF01.3: O sistema deve utilizar tokens de sessão seguros (ex: JWT) com expiração automática após 8 horas de inatividade.

RF01.4: Deve haver uma tela restrita ao administrador para cadastrar, editar ou desativar usuários.

RF02: Integração e Sincronização de Dados (Google Sheets)
RF02.1: A comunicação com o Google Drive deve ser feita de forma segura utilizando uma Conta de Serviço (Service Account) do Google Cloud. As planilhas de origem devem permanecer privadas.

RF02.2: O sistema deve possuir uma rotina automatizada (Cron Job) executada diariamente às 06:15 AM para buscar os dados atualizados das duas planilhas.

RF02.3: Os dados extraídos devem ser salvos em um banco de dados local ou mecanismo de cache (ex: Redis, PostgreSQL, SQLite ou Firebase) para evitar consultas repetidas à API do Google durante o dia.

RF03: Dashboards e Visualização (BI)
RF03.1: O sistema deve possuir uma Dashboard principal contendo os dados consolidados da Planilha 1.

RF03.2: O sistema deve possuir uma segunda página/aba contendo os dados consolidados da Planilha 2.

RF03.3: Os dados devem ser exibidos através de componentes visuais:

Cards com KPIs principais (ex: Faturamento, Total de Vendas, Clientes Atendidos).

Gráficos de linha/área para tendências temporais.

Gráficos de barra/pizza para comparações de categorias.

Tabelas paginadas com opção de busca rápida.

RF03.4: O sistema deve exibir em local visível a data e hora da última atualização dos dados (ex: "Dados atualizados em: DD/MM/AAAA às 06:15").

4. Requisitos Não-Funcionais (RNF)
RNF01: Segurança
RNF01.1: Todo o tráfego do sistema deve ser criptografado via HTTPS (SSL/TLS).

RNF01.2: As credenciais do Google Cloud (arquivo JSON) nunca devem ser expostas no código público (devem ser armazenadas em variáveis de ambiente .env no servidor).

RNF01.3: As senhas dos usuários devem ser armazenadas utilizando algoritmos de hash seguros (ex: bcrypt).

RNF02: Desempenho e Disponibilidade
RNF02.1: O tempo de carregamento dos gráficos na tela do usuário não deve passar de 2 segundos, uma vez que os dados estarão pré-carregados no cache/banco local.

RNF02.2: O sistema deve ser responsivo, permitindo a visualização dos dashboards em computadores, tablets e smartphones.

RNF03: Escalaridade/Limites
RNF03.1: O sistema deve respeitar as cotas de requisição da Google Sheets API, mitigadas pela arquitetura de cache diário definida no RF02.3.

5. Jornada do Usuário (User Stories)
Como Gestor da Empresa, eu quero acessar o site, digitar meu login/senha e ver os gráficos atualizados do dia, para que eu possa tomar decisões rápidas logo cedo sem expor nossos dados para a internet.

Como Diretor, eu quero abrir o sistema pelo meu celular a caminho do trabalho, para que eu possa acompanhar o fechamento do dia anterior de forma legível e rápida.

Como Administrador do Sistema, eu quero poder desativar o acesso de um funcionário desligado, para garantir que ele não tenha mais acesso às informações da empresa.

6. Stack Tecnológica Sugerida (Exemplo de Implementação)
Frontend: React.js ou Vue.js (para uma interface moderna) + Tailwind CSS (design) + ApexCharts ou Chart.js (gráficos).

Backend: Node.js (Express) ou Python (FastAPI/Flask) — excelentes para lidar com APIs do Google e criar rotinas Cron.

Banco de Dados/Cache: PostgreSQL (para salvar usuários e histórico de dados) ou Firebase (banco de dados e login integrados e rápidos de configurar).

Integração: Biblioteca oficial googleapis (Google Auth + Google Sheets API v4).

7. Critérios de Aceite para Homologação (Testes)
[ ] O usuário consegue deslogar e, ao tentar acessar a URL do dashboard diretamente, é redirecionado para a tela de login.

[ ] Às 06:15, o backend roda com sucesso, consome a API do Google usando a Service Account sem erros de permissão e atualiza o banco local.

[ ] Se a planilha do Google estiver fora do ar ou vazia às 06:15, o sistema mantém os dados do dia anterior em cache e alerta o administrador, em vez de quebrar a tela do usuário.

[ ] Os gráficos carregam em menos de 2 segundos no ambiente de produção.