import type { WorkspaceRole } from '@/types/projects'

/**
 * Textos de ajuda da área de Projectos (português europeu, frases curtas, sem jargão).
 * Usados com `<InfoTooltip {...HELP.chave} />`: `label` identifica o tema (aria-label do botão
 * "Ajuda: …") e `text` é a explicação mostrada.
 *
 * Glossário: "o sprint", "backlog", "quadro", "coluna", "responsável", "seguir".
 */
export interface HelpEntry {
  label: string
  text: string
}

export const HELP = {
  // Estrutura
  structure: {
    label: 'Workspace, projecto e quadro',
    text: 'O workspace é a equipa (quem tem acesso). Cada workspace tem vários projectos. Cada projecto tem um ou mais quadros, com colunas por onde as tarefas avançam.',
  },
  workspace: {
    label: 'Workspace',
    text: 'Um workspace agrupa projectos e define quem tem acesso a eles: os membros do workspace (incluindo leitores) vêem os seus projectos, conforme o papel de cada um.',
  },
  board: {
    label: 'Quadro',
    text: 'O quadro organiza as tarefas do projecto em colunas (ex.: Por fazer, Em curso, Concluído). Normalmente basta um quadro por projecto.',
  },

  // Vistas
  viewKanban: {
    label: 'Kanban',
    text: 'Mostra as tarefas em colunas. Arraste um cartão (ou use Espaço e as setas) para o passar à coluna seguinte. Por omissão mostra só o sprint activo.',
  },
  viewList: {
    label: 'Lista',
    text: 'Todas as tarefas do quadro numa tabela, que pode ordenar por título, coluna, prioridade, responsáveis ou prazo.',
  },
  viewBacklog: {
    label: 'Backlog',
    text: 'É aqui que se planeia: veja o backlog do projecto e os sprints, crie sprints e decida que tarefas entram em cada um.',
  },
  viewActivity: {
    label: 'Actividade',
    text: 'Histórico de alterações do projecto: quem criou, moveu ou alterou cada tarefa, e quando.',
  },

  // Sprints e backlog
  sprint: {
    label: 'Sprint',
    text: 'Um sprint é um período curto (normalmente 1 a 2 semanas) com um conjunto de tarefas que a equipa se compromete a terminar. Só pode haver um sprint activo de cada vez.',
  },
  sprintStatus: {
    label: 'Estados do sprint',
    text: 'Planeado: ainda em preparação. Activo: a decorrer, é o que o Kanban mostra. Concluído: terminado; ao concluir, escolhe se as tarefas pendentes voltam ao backlog ou passam para o próximo sprint planeado.',
  },
  sprintPlanned: {
    label: 'Sprint planeado',
    text: 'Sprint em preparação: pode juntar-lhe tarefas. Quando estiver pronto, use “Iniciar sprint”.',
  },
  sprintActive: {
    label: 'Sprint activo',
    text: 'O sprint a decorrer. O Kanban mostra as suas tarefas por omissão. Só pode haver um activo por projecto.',
  },
  sprintCompleted: {
    label: 'Sprint concluído',
    text: 'Sprint terminado, guardado como histórico. Ao concluí-lo, escolheu-se se as tarefas pendentes voltavam ao backlog ou passavam para o próximo sprint planeado. Já não é possível pôr tarefas num sprint concluído.',
  },
  backlog: {
    label: 'Backlog do projecto',
    text: 'Lista de tarefas que ainda não estão em nenhum sprint. As tarefas novas ficam aqui, excepto quando são criadas no Kanban com o sprint activo seleccionado ou numa secção de sprint do Backlog: nesses casos entram nesse sprint.',
  },
  kanbanFilter: {
    label: 'Que tarefas mostrar',
    text: 'Sprint activo: só as tarefas do sprint a decorrer. Todas as tarefas: tudo o que existe no quadro. Só backlog: tarefas ainda sem sprint.',
  },

  // Colunas
  column: {
    label: 'Coluna',
    text: 'Cada coluna é uma etapa do trabalho (ex.: Por fazer, Em curso). A coluna onde a tarefa está indica em que ponto ela se encontra.',
  },
  doneColumn: {
    label: 'Coluna de conclusão',
    text: 'As tarefas nesta coluna contam como terminadas: deixam de aparecer como atrasadas e não voltam ao backlog quando o sprint é concluído.',
  },

  // Campos da tarefa
  priority: {
    label: 'Prioridade',
    text: 'Indica a urgência: Baixa, Média, Alta ou Urgente. Ajuda a equipa a decidir o que fazer primeiro.',
  },
  taskType: {
    label: 'Tipo de tarefa',
    text: 'Tarefa: trabalho normal. Bug: algo que não funciona. História: uma funcionalidade vista pelo utilizador. Épico: um objectivo grande, dividido em várias tarefas.',
  },
  assignees: {
    label: 'Responsáveis',
    text: 'Quem vai fazer a tarefa. Só pode escolher membros do workspace (os leitores não podem ser responsáveis). Os responsáveis são notificados quando lhes é atribuída a tarefa, quando ela muda de coluna e quando há comentários.',
  },
  watch: {
    label: 'Seguir',
    text: 'Quem segue uma tarefa recebe notificações dos comentários e das mudanças de coluna, mesmo sem ser responsável.',
  },
  labels: {
    label: 'Etiquetas',
    text: 'Palavras-chave com cor (ex.: Frontend, Cliente X) para agrupar e encontrar tarefas mais depressa.',
  },
  subtasks: {
    label: 'Subtarefas',
    text: 'Divida uma tarefa grande em passos mais pequenos. Cada subtarefa tem a sua coluna; conta como concluída quando chega à coluna de conclusão.',
  },
  relations: {
    label: 'Relações',
    text: 'Ligue tarefas entre si. Bloqueia: esta tem de terminar antes da outra. Bloqueada por: o contrário. Relacionada com: assunto próximo. Duplica: é a mesma tarefa que outra.',
  },
  estimate: {
    label: 'Estimativa',
    text: 'Esforço previsto para a tarefa (por exemplo em horas ou pontos, conforme a equipa combinar). Ajuda a não sobrecarregar um sprint.',
  },
  dueDate: {
    label: 'Prazo',
    text: 'Data limite da tarefa. Se passar e a tarefa não estiver na coluna de conclusão, aparece como atrasada.',
  },

  // Ligação do projecto ao cliente
  projectLink: {
    label: 'Relação com o cliente',
    text: 'Opcional. Um software pode estar instalado em vários clientes, e cada instalação tem os seus módulos activos. Escolha o software, depois (se o trabalho for para um cliente) o cliente, e por fim os módulos envolvidos.',
  },
  projectSoftware: {
    label: 'Software',
    text: 'O produto de software em que este projecto trabalha (ex.: Level-School). Deixe vazio se o projecto não for sobre um produto.',
  },
  projectClient: {
    label: 'Cliente',
    text: 'O cliente para quem é o trabalho. Só aparecem clientes que têm o software escolhido instalado. Deixe vazio para projectos internos do produto.',
  },
  projectModules: {
    label: 'Módulos',
    text: 'As partes do software envolvidas no projecto. Com um cliente escolhido, só aparecem os módulos activos na instalação desse cliente.',
  },

  // Controlo de Software: deployments e máquinas
  databaseEngine: {
    label: 'Motor de base de dados',
    text: 'O tipo de sistema de base de dados que o software usa (ex.: MySQL, PostgreSQL). Escolha "Sem base de dados" se não usar nenhuma.',
  },
  databaseName: {
    label: 'Nome da base de dados',
    text: 'A base de dados concreta, dentro desse servidor, onde esta instalação guarda os dados. É própria de cada instalação.',
  },
  databaseHost: {
    label: 'Host da base de dados',
    text: 'Onde corre o servidor de base de dados: na própria máquina do deployment (localhost), noutra máquina registada, ou noutro endereço (IP ou nome).',
  },
  operatingSystem: {
    label: 'Sistema operativo',
    text: 'O sistema instalado na máquina. Se não constar da lista, escolha "Outro…" e escreva-o.',
  },
  softwareCategory: {
    label: 'Categoria',
    text: 'Área a que o software pertence (ex.: Gestão Escolar). Serve para agrupar produtos parecidos.',
  },
  softwareModules: {
    label: 'Módulos',
    text: 'Partes de um software que podem ser activadas por cliente (ex.: Matrículas, Propinas). Registam-se aqui e depois escolhem-se em cada cliente.',
  },

  // Administração
  globalRoles: {
    label: 'Papéis globais e papéis no workspace',
    text: 'Os papéis desta página são globais: definem o que cada pessoa pode fazer na aplicação inteira (ex.: ver o Controlo de Software). O papel dentro de cada workspace (dono, gestor, membro, leitor) define-se no botão "Membros" desse workspace.',
  },
  userStatus: {
    label: 'Estado da conta',
    text: 'Uma conta inactiva não consegue entrar na aplicação, mas mantém o histórico (tarefas, comentários, actividade). Pode ser reactivada a qualquer momento.',
  },

  // Papéis
  roles: {
    label: 'Papéis no workspace',
    text: 'Dono: controlo total. Gestor: gere membros, quadros, colunas e sprints. Membro: cria e trabalha nas tarefas. Leitor: só consulta e comenta.',
  },
} as const satisfies Record<string, HelpEntry>

export type HelpKey = keyof typeof HELP

export const WORKSPACE_ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: 'Dono',
  manager: 'Gestor',
  member: 'Membro',
  viewer: 'Leitor',
}

export const WORKSPACE_ROLE_HELP: Record<WorkspaceRole, string> = {
  owner:
    'Controlo total do workspace: gere membros (incluindo dar o papel de dono), quadros, sprints e tarefas.',
  manager: 'Gere membros, quadros, colunas e sprints, e trabalha nas tarefas.',
  member: 'Cria tarefas e trabalha nelas (mover, comentar, atribuir).',
  viewer:
    'Só consulta e comenta: vê projectos e tarefas, mas não as altera nem pode ser responsável.',
}
