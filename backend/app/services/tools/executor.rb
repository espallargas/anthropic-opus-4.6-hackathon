module Tools
  class Executor
    def self.call(name, input)
      case name
      when 'search_visa_requirements'
        search_visa_requirements(input)
      when 'check_processing_times'
        check_processing_times(input)
      else
        { error: "Unknown tool: #{name}" }.to_json
      end
    end

    def self.search_visa_requirements(input)
      origin = input['origin'] || 'Unknown'
      destination = input['destination'] || 'Unknown'
      visa_type = input['visa_type'] || 'general'

      {
        origin: origin,
        destination: destination,
        visa_type: visa_type,
        requirements: {
          documents: [
            'Passaporte válido (mínimo 6 meses de validade)',
            'Formulário de solicitação preenchido',
            'Foto 3x4 recente (fundo branco)',
            'Comprovante de meios financeiros',
            'Seguro saúde/viagem',
            'Carta convite ou contrato (se aplicável)',
            'Certidão de antecedentes criminais'
          ],
          eligibility: [
            'Não ter restrições de entrada no país de destino',
            'Comprovar vínculo com país de origem (se aplicável)',
            'Atender requisitos específicos do tipo de visto'
          ],
          steps: [
            '1. Reunir documentos necessários',
            '2. Preencher formulário online',
            '3. Agendar entrevista no consulado/embaixada',
            '4. Pagar taxa consular',
            '5. Comparecer à entrevista',
            '6. Aguardar decisão'
          ],
          fees: {
            consular_fee: 'EUR 80-120 (varia por tipo)',
            service_fee: 'EUR 30-50 (centro de vistos)'
          }
        }
      }.to_json
    end

    def self.check_processing_times(input)
      destination = input['destination'] || 'Unknown'
      visa_type = input['visa_type'] || 'general'

      {
        destination: destination,
        visa_type: visa_type,
        processing_times: {
          standard: '15-30 dias úteis',
          expedited: '5-10 dias úteis (taxa adicional)',
          peak_season_warning: 'Junho-Setembro: prazos podem ser 50% maiores'
        },
        tips: [
          'Solicite com pelo menos 3 meses de antecedência',
          'Documentos incompletos causam atrasos significativos',
          'Acompanhe o status pelo portal do consulado'
        ],
        last_updated: Time.current.strftime('%Y-%m-%d')
      }.to_json
    end

    private_class_method :search_visa_requirements, :check_processing_times
  end
end
