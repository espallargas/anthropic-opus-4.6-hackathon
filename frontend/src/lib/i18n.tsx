/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type Locale = 'pt-BR' | 'en'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const STORAGE_KEY = 'app_locale'

const dictionaries: Record<Locale, Record<string, string>> = {
  'pt-BR': {
    'app.title': 'Assistente de Imigração',
    'sidebar.reconfigure': 'Reconfigurar',
    'sidebar.reconfigure.tooltip': 'Reconfigurar dados',
    'sidebar.expand': 'Expandir',
    'sidebar.collapse': 'Colapsar',
    'sidebar.language': 'Idioma',
    'chat.empty': 'Envie uma mensagem para começar.',
    'chat.placeholder': 'Digite sua mensagem...',
    'chat.stop': 'Parar (Esc)',
    'chat.send': 'Enviar',
    'chat.interrupted': '*[resposta interrompida]*',
    'setup.description':
      'Preencha seus dados para receber orientações personalizadas sobre seu processo de imigração.',
    'setup.origin': 'País de origem',
    'setup.origin.placeholder': 'Selecione seu país de origem',
    'setup.nationality': 'Nacionalidade',
    'setup.nationality.placeholder': 'Ex: Brasileira',
    'setup.destination': 'País de destino',
    'setup.destination.placeholder': 'Selecione seu país de destino',
    'setup.visa': 'Tipo de visto / objetivo',
    'setup.visa.placeholder': 'Ex: Trabalho, estudo, residência permanente',
    'setup.additional': 'Informações adicionais (opcional)',
    'setup.additional.placeholder': 'Contexto adicional que possa ajudar nas respostas...',
    'setup.submit': 'Iniciar chat',
    'setup.step.origin': 'País de origem',
    'setup.step.origin.description': 'De qual país você estará saindo?',
    'setup.step.nationalities': 'Nacionalidades',
    'setup.step.nationalities.description': 'Liste todas as suas nacionalidades atuais',
    'setup.step.destination': 'País de destino',
    'setup.step.objective': 'Objetivo',
    'setup.step.objective.description': 'Qual é o seu motivo de ida para o país de destino?',
    'setup.objective.temporary_visit': 'Visita temporária',
    'setup.objective.education': 'Educação',
    'setup.objective.work': 'Trabalho',
    'setup.objective.family_reunion': 'Reunir família',
    'setup.objective.seek_protection': 'Buscar proteção',
    'setup.objective.investments': 'Investimentos',
    'setup.objective.permanent_residence': 'Residência permanente',
    'setup.objective.other': 'Outro',
    'setup.objective.other.placeholder': 'Descreva seu objetivo...',
    'setup.next': 'Próximo',
    'setup.back': 'Voltar',
    'setup.start': 'Iniciar chat',
    'setup.search.placeholder': 'Buscar país...',
    'tool.search_visa_requirements': 'Buscando requisitos de visto',
    'tool.check_processing_times': 'Consultando prazos de processamento',
    'sidebar.newChat': 'Novo chat',
    'sidebar.deleteChat': 'Excluir chat',
    'globe.loading': 'Carregando globo...',
    'admin.header.title': 'Legislação Admin',
    'admin.header.description': 'Gerenciar legislação por país',
    'admin.section.active': 'Ativo',
    'admin.section.pending': 'Pendente',
    'admin.country_item.updated': 'atualizado',
    'admin.country_item.view_legislations': 'Ver legislações',
    'admin.country_item.refresh_legislation': 'Atualizar legislação',
    'admin.units.doc': 'doc',
    'admin.units.docs': 'docs',
    'admin.units.legislation': 'legislação',
    'admin.units.legislations': 'legislações',
    'admin.crawl.loading': 'Carregando...',
    'admin.crawl.pause': 'Pausar rastreamento',
    'admin.crawl.close': 'Fechar',
    'admin.crawl.starting': 'Iniciando rastreamento...',
    'admin.crawl.complete': '✓ Rastreamento completo',
    'admin.crawl.documents_saved': 'documentos salvos',
    'admin.crawl.stop_confirm': 'Parar rastreamento?',
    'admin.crawl.stop_description': 'O progresso será descartado. Todos os dados são salvos apenas no final.',
    'admin.crawl.stop_cancel': 'Cancelar',
    'admin.crawl.stop_confirm_button': 'Parar e Fechar',
    'admin.categories.title': 'Categorias',
    'admin.categories.searching': 'Pesquisando...',
    'admin.categories.results_crawled': 'resultados web rastreados',
    'admin.categories.parsed': 'legislações analisadas',
    'admin.thinking.title': 'Pensando',
    'admin.thinking.waiting': 'Aguardando Claude pensar...',
    'admin.thinking.tokens': 'Tokens:',
    'admin.output.title': 'Saída do Claude',
    'admin.output.waiting': 'Aguardando saída do Claude...',
    'admin.legislation_panel.loading': 'Carregando...',
    'admin.legislation_panel.empty': 'Sem legislações',
    'admin.category.federal_laws': 'Leis Federais',
    'admin.category.federal_laws.description': 'Leis constitucionais & principais',
    'admin.category.regulations': 'Regulamentos',
    'admin.category.regulations.description': 'Procedimentos oficiais',
    'admin.category.consular': 'Regras Consulares',
    'admin.category.consular.description': 'Visto & embaixadas',
    'admin.category.jurisdictional': 'Jurisdicional',
    'admin.category.jurisdictional.description': 'Regras regionais',
    'admin.category.complementary': 'Saúde & Complementar',
    'admin.category.complementary.description': 'Requisitos de saúde',
    'admin.category.auxiliary': 'Auxiliar',
    'admin.category.auxiliary.description': 'Estatísticas & quotas',
  },
  en: {
    'app.title': 'Immigration Assistant',
    'sidebar.reconfigure': 'Reconfigure',
    'sidebar.reconfigure.tooltip': 'Reconfigure data',
    'sidebar.expand': 'Expand',
    'sidebar.collapse': 'Collapse',
    'sidebar.language': 'Language',
    'chat.empty': 'Send a message to get started.',
    'chat.placeholder': 'Type your message...',
    'chat.stop': 'Stop (Esc)',
    'chat.send': 'Send',
    'chat.interrupted': '*[response interrupted]*',
    'setup.description':
      'Fill in your details to receive personalized guidance on your immigration process.',
    'setup.origin': 'Country of origin',
    'setup.origin.placeholder': 'Select your country of origin',
    'setup.nationality': 'Nationality',
    'setup.nationality.placeholder': 'Ex: Brazilian',
    'setup.destination': 'Destination country',
    'setup.destination.placeholder': 'Select your destination country',
    'setup.visa': 'Visa type / objective',
    'setup.visa.placeholder': 'Ex: Work, study, permanent residence',
    'setup.additional': 'Additional information (optional)',
    'setup.additional.placeholder': 'Additional context that may help...',
    'setup.submit': 'Start chat',
    'setup.step.origin': 'Country of origin',
    'setup.step.origin.description': 'Which country will you be departing from?',
    'setup.step.nationalities': 'Nationalities',
    'setup.step.nationalities.description': 'List all your current nationalities',
    'setup.step.destination': 'Destination country',
    'setup.step.objective': 'Objective',
    'setup.step.objective.description':
      'What is your reason for going to the destination country?',
    'setup.objective.temporary_visit': 'Temporary visit',
    'setup.objective.education': 'Education',
    'setup.objective.work': 'Work',
    'setup.objective.family_reunion': 'Family reunion',
    'setup.objective.seek_protection': 'Seek protection',
    'setup.objective.investments': 'Investments',
    'setup.objective.permanent_residence': 'Permanent residence',
    'setup.objective.other': 'Other',
    'setup.objective.other.placeholder': 'Describe your objective...',
    'setup.next': 'Next',
    'setup.back': 'Back',
    'setup.start': 'Start chat',
    'setup.search.placeholder': 'Search country...',
    'tool.search_visa_requirements': 'Searching visa requirements',
    'tool.check_processing_times': 'Checking processing times',
    'sidebar.newChat': 'New chat',
    'sidebar.deleteChat': 'Delete chat',
    'globe.loading': 'Loading globe...',
    'admin.header.title': 'Legislation Admin',
    'admin.header.description': 'Manage country legislation',
    'admin.section.active': 'Active',
    'admin.section.pending': 'Pending',
    'admin.country_item.updated': 'updated',
    'admin.country_item.view_legislations': 'View legislations',
    'admin.country_item.refresh_legislation': 'Refresh legislation',
    'admin.units.doc': 'doc',
    'admin.units.docs': 'docs',
    'admin.units.legislation': 'legislation',
    'admin.units.legislations': 'legislations',
    'admin.crawl.loading': 'Loading...',
    'admin.crawl.pause': 'Pause crawl',
    'admin.crawl.close': 'Close',
    'admin.crawl.starting': 'Starting crawl...',
    'admin.crawl.complete': '✓ Crawl complete',
    'admin.crawl.documents_saved': 'documents saved',
    'admin.crawl.stop_confirm': 'Stop crawl?',
    'admin.crawl.stop_description': 'Progress will be discarded. All data is only saved at the end.',
    'admin.crawl.stop_cancel': 'Cancel',
    'admin.crawl.stop_confirm_button': 'Stop & Close',
    'admin.categories.title': 'Categories',
    'admin.categories.searching': 'Searching...',
    'admin.categories.results_crawled': 'web results crawled',
    'admin.categories.parsed': 'legislations parsed',
    'admin.thinking.title': 'Thinking',
    'admin.thinking.waiting': 'Waiting for Claude to think...',
    'admin.thinking.tokens': 'Tokens:',
    'admin.output.title': 'Claude Output',
    'admin.output.waiting': 'Waiting for Claude output...',
    'admin.legislation_panel.loading': 'Loading...',
    'admin.legislation_panel.empty': 'No legislations',
    'admin.category.federal_laws': 'Federal Laws',
    'admin.category.federal_laws.description': 'Constitutional & main laws',
    'admin.category.regulations': 'Regulations',
    'admin.category.regulations.description': 'Official procedures',
    'admin.category.consular': 'Consular Rules',
    'admin.category.consular.description': 'Visa & embassies',
    'admin.category.jurisdictional': 'Jurisdictional',
    'admin.category.jurisdictional.description': 'Regional rules',
    'admin.category.complementary': 'Health & Complementary',
    'admin.category.complementary.description': 'Health requirements',
    'admin.category.auxiliary': 'Auxiliary',
    'admin.category.auxiliary.description': 'Statistics & quotas',
  },
}

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'pt-BR' || stored === 'en') return stored
  } catch {
    // ignore
  }
  return 'pt-BR'
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(STORAGE_KEY, newLocale)
    } catch {
      // ignore
    }
  }, [])

  const t = useCallback((key: string) => dictionaries[locale][key] ?? key, [locale])

  return <I18nContext value={{ locale, setLocale, t }}>{children}</I18nContext>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
