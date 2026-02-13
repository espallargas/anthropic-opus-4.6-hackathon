namespace :demo do
  desc 'Populate Brazil with example legislations'
  task populate_br: :environment do
    br = Country.find_by(code: 'br')
    return puts "Brazil not found" unless br

    legislations_data = [
      {
        category: :federal_laws,
        title: 'Lei 13.445/2017 - Lei de Migração',
        content: 'Esta é a Lei de Migração brasileira que estabelece os princípios e diretrizes da política de migração brasileira, disciplina os direitos e os deveres do migrante e do visitante e regula a sua entrada e permanência no território nacional. Lei n° 13.445, de 24 de maio de 2017. A lei reconhece o migrante como sujeito de direitos e deveres, observando-se a dignidade da pessoa humana, a não discriminação, o respeito aos direitos humanos e a proteção do migrante em situação de vulnerabilidade.',
        summary: 'Lei principal que regulamenta a imigração no Brasil, estabelecendo direitos e deveres dos migrantes.',
        source_url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13445.htm',
        date_effective: Date.parse('2017-11-21')
      },
      {
        category: :federal_laws,
        title: 'Constituição Federal de 1988',
        content: 'A Constituição Federal de 1988 é a lei suprema da República Federativa do Brasil. Define os direitos fundamentais dos estrangeiros, incluindo igualdade perante a lei, inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade.',
        summary: 'Constituição que garante direitos fundamentais aos estrangeiros no Brasil.',
        source_url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm',
        date_effective: Date.parse('1988-10-05')
      },
      {
        category: :regulations,
        title: 'Portaria 666/2021 - Normas de Processamento',
        content: 'Portaria que regulamenta os procedimentos para processamento de pedidos de migração no Brasil. Estabelece os prazos, documentos necessários e procedimentos administrativos para solicitação de vistos, autorização de residência e naturalização.',
        summary: 'Regulamentação dos procedimentos para processamento de migração.',
        source_url: 'https://www.in.gov.br/web/dou',
        date_effective: Date.parse('2021-06-01')
      },
      {
        category: :consular,
        title: 'Requisitos de Visto - Atualizado 2024',
        content: 'Documento oficial listando os requisitos atualizados para obtenção de visto brasileiro em 2024. Inclui documentação necessária, validade do visto, tipos de visto disponíveis e procedimentos de aplicação em embaixadas e consulados brasileiros. Requer passaporte válido, formulário de solicitação, foto, comprovante de renda, seguro viagem e outros documentos específicos conforme o tipo de visto.',
        summary: 'Lista atualizada de requisitos para obtenção de visto brasileiro.',
        source_url: 'https://www.itamaraty.gov.br/pt-BR/assuntos/temas-prioritarios',
        date_effective: Date.parse('2024-01-01')
      },
      {
        category: :consular,
        title: 'Procedimentos de Entrevista Consular',
        content: 'Guia de procedimentos para entrevista consular para candidatos a visto. Descreve o processo de agendamento, documentos a levar, perguntas típicas e critérios de aprovação. As entrevistas são realizadas por oficiais consulares treinados e visam verificar a veracidade das informações e a elegibilidade do candidato.',
        summary: 'Guia sobre procedimentos de entrevista consular.',
        source_url: 'https://www.itamaraty.gov.br/',
        date_effective: Date.parse('2023-06-01')
      },
      {
        category: :jurisdictional,
        title: 'Resolução Estadual - Direitos do Migrante em SP',
        content: 'Resolução estadual de São Paulo que complementa a legislação federal com proteções específicas e direitos adicionais para migrantes residindo no estado. Inclui acesso a serviços de saúde, educação e assistência social sem discriminação.',
        summary: 'Direitos específicos para migrantes em São Paulo.',
        source_url: 'https://www.saopaulo.sp.gov.br/',
        date_effective: Date.parse('2018-03-15')
      },
      {
        category: :complementary,
        title: 'Requisitos de Saúde 2024 - Vacinação e Documentos',
        content: 'Documento oficial listando os requisitos de saúde para entrada no Brasil em 2024. Inclui vacinas obrigatórias (febre amarela, tétano, etc.), certificados de vacinação, testes de COVID-19 se necessário, e documentação médica adicional. A vacinação contra febre amarela é especialmente recomendada para certas regiões.',
        summary: 'Requisitos de saúde e vacinação obrigatória para entrada no Brasil.',
        source_url: 'https://www.saude.gov.br/',
        date_effective: Date.parse('2024-01-01')
      },
      {
        category: :complementary,
        title: 'Certificado Internacional de Vacinação e Profilaxia',
        content: 'Informações sobre o Certificado Internacional de Vacinação e Profilaxia (CIVP), também conhecido como Cartão Amarelo. Documento oficialmente reconhecido que prova vacinação contra doenças específicas. Deve ser assinado e carimbado por centro de vacinação autorizado.',
        summary: 'Informações sobre certificado internacional de vacinação.',
        source_url: 'https://www.saude.gov.br/',
        date_effective: Date.parse('2020-01-01')
      },
      {
        category: :auxiliary,
        title: 'Estatísticas de Imigração 2023',
        content: 'Relatório oficial com estatísticas completas de imigração no Brasil em 2023. Inclui número total de migrantes, principais países de origem, distribuição por estados, profissões mais comuns, taxas de aprovação de vistos e outras métricas demográficas e econômicas.',
        summary: 'Estatísticas e dados sobre imigração no Brasil.',
        source_url: 'https://www.gov.br/',
        date_effective: Date.parse('2024-02-01')
      },
      {
        category: :auxiliary,
        title: 'Lista de Ocupações em Demanda 2024',
        content: 'Lista oficial de ocupações e profissões em alta demanda no Brasil, atualizada para 2024. Inclui engenheiros, profissionais de TI, médicos, enfermeiros, técnicos especializados e outras profissões. Este documento é utilizado para avaliar elegibilidade em programas de imigração baseados em skills.',
        summary: 'Profissões em demanda e quotas de imigração para 2024.',
        source_url: 'https://www.gov.br/',
        date_effective: Date.parse('2024-01-01')
      }
    ]

    legislations_to_insert = []
    legislations_data.each do |data|
      legislations_to_insert << {
        country_id: br.id,
        category: Legislation.categories[data[:category]],
        title: data[:title],
        content: data[:content],
        summary: data[:summary],
        source_url: data[:source_url],
        date_effective: data[:date_effective],
        is_deprecated: false,
        crawled_at: Time.current,
        created_at: Time.current,
        updated_at: Time.current
      }
    end

    Legislation.insert_all(legislations_to_insert)
    br.update!(last_crawled_at: Time.current)

    puts "✅ Populated Brazil with #{Legislation.count} legislations"
    puts "   Status: #{br.reload.last_crawled_at.nil? ? 'RED' : 'GREEN'}"
  end
end
