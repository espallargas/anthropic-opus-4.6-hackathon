require 'net/http'
require 'json'

module Tools
  class Executor
    def self.call(tool_name, input)
      case tool_name
      when 'web_search'
        query = if input.is_a?(Hash)
          input['query']
        elsif input.respond_to?(:query)
          input.query
        elsif input.respond_to?(:[])
          input[:query] || input['query']
        end

        web_search(query.to_s)
      else
        { error: "Unknown tool: #{tool_name}" }.to_json
      end
    end

    private

    def self.web_search(query)
      # Mock web search - in production would use SerpAPI, Google Search API, etc.
      results = mock_search_results(query)
      {
        query: query,
        results: results,
        status: "success"
      }.to_json
    end

    def self.mock_search_results(query)
      # Return mock legislation data with realistic names for Brazilian immigration
      # In production, this would use real web search API

      base_url = "https://www.planalto.gov.br"
      query_lower = query.downcase

      # Country-specific mock data with realistic law names
      brazil_laws = {
        "federal" => [
          { title: "Lei 13.445/2017 - Lei de Migração", date: "2017-11-21", url: "#{base_url}/ccivil_03/_ato2015-2018/2017/lei/l13445.htm" },
          { title: "Decreto 9.199/2017 - Regulamento da Lei de Migração", date: "2017-11-21", url: "#{base_url}/ccivil_03/_ato2015-2018/2017/decreto/d9199.htm" },
          { title: "Constituição Federal - Artigos 5º e 196 (Direitos de Estrangeiros)", date: "1988-10-05", url: "#{base_url}/ccivil_03/constituicao/constituicao.htm" }
        ],
        "regulations" => [
          { title: "Portaria Interministerial 35/2018 - Procedimentos Migratórios", date: "2018-06-20", url: "#{base_url}/dou/2018/junho/portaria-35.htm" },
          { title: "Resolução CONARE 27/2018 - Critérios de Reconhecimento de Refugiados", date: "2018-08-01", url: "#{base_url}/resolucao-conare-27.htm" },
          { title: "Instrução Normativa SENATRAN - Carteira de Motorista para Imigrantes", date: "2023-01-15", url: "#{base_url}/in-senatran-carteira.htm" }
        ],
        "consular" => [
          { title: "Resolução Itamaraty 96/2009 - Vistos em Representações Diplomáticas", date: "2009-02-14", url: "#{base_url}/itamaraty/vistos-res-96.htm" },
          { title: "Portaria Itamaraty 4/2020 - Procedimentos de Visto de Curta Permanência", date: "2020-01-20", url: "#{base_url}/itamaraty/portaria-4-2020.htm" },
          { title: "Memorando Circular - Documentação Exigida em Consulados", date: "2023-06-10", url: "#{base_url}/itamaraty/memorando-documentos.htm" }
        ],
        "jurisdictional" => [
          { title: "Lei Estadual SP 11.922/2019 - Política de Migrantes", date: "2019-04-15", url: "#{base_url}/leisestaduais/sp/lei-migrantes.htm" },
          { title: "Decreto Estadual RJ 47.890/2021 - Centros de Atendimento para Imigrantes", date: "2021-03-10", url: "#{base_url}/decretosestadais/rj/decreto-47890.htm" },
          { title: "Portaria Municipal BH - Serviços de Acolhimento para Refugiados", date: "2022-09-01", url: "#{base_url}/portariasbh/acolhimento-refugiados.htm" }
        ],
        "complementary" => [
          { title: "Portaria SVS 344/2018 - Requisitos Sanitários para Imigração", date: "2018-05-30", url: "#{base_url}/svs/portaria-344-requisitos.htm" },
          { title: "Resolução ANVISA 16/2012 - Vacinação e Documentação Sanitária", date: "2012-03-20", url: "#{base_url}/anvisa/resolucao-16-vacinacao.htm" },
          { title: "Lei 9.313/1996 - Acesso a Tratamento para HIV/AIDS (inclui imigrantes)", date: "1996-11-13", url: "#{base_url}/ccivil_03/leis/l9313.htm" }
        ],
        "auxiliary" => [
          { title: "Dados Estatísticos SEAE 2024 - Imigração e Refúgio no Brasil", date: "2024-01-30", url: "#{base_url}/seae/estatisticas-migracao-2024.htm" },
          { title: "Resolução CONARE - Cotas de Refúgio por Ano", date: "2023-12-15", url: "#{base_url}/conare/cotas-refugio-2024.htm" },
          { title: "Lista de Ocupações em Demanda - Ministério do Trabalho", date: "2023-11-01", url: "#{base_url}/trabalho/ocupacoes-demanda-2024.htm" }
        ]
      }

      # Choose category based on query keywords
      category = case query_lower
                 when /federal|main|constitution|lei.*2017/i then "federal"
                 when /regulat|procedure|portaria|instrução/i then "regulations"
                 when /consular|visa|embassy|visto/i then "consular"
                 when /regional|province|state|estadual|municipal/i then "jurisdictional"
                 when /health|vaccine|saúde|vacinação/i then "complementary"
                 when /statistic|quota|demanda|occupat/i then "auxiliary"
                 else "federal"
                 end

      laws = brazil_laws[category] || brazil_laws["federal"]

      # Return 3 mock results with realistic data
      laws.take(3).map do |law|
        {
          title: law[:title],
          snippet: "Official Brazilian legislation regarding #{query}. Full text and details available.",
          url: law[:url],
          type: "legislation",
          date: law[:date]
        }
      end
    end
  end
end
