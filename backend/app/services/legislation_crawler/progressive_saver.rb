module LegislationCrawler
  # Parses streaming JSON text and saves each category as soon as its array closes.
  # This allows Sidekiq extraction jobs to start while Claude is still outputting later categories.
  class ProgressiveSaver
    attr_reader :saved_categories

    def initialize(country, emit_proc, parse_complete_emitted)
      @country = country
      @emit_proc = emit_proc
      @parse_complete_emitted = parse_complete_emitted
      @text_buffer = ""
      @saved_categories = Set.new
      @saved_count = 0
    end

    def on_text_delta(text)
      @text_buffer += text
      try_save_completed_categories
    end

    private

    def try_save_completed_categories
      max_end_idx = 0

      PromptBuilder.category_ids.each do |category_id|
        next if @saved_categories.include?(category_id)

        items, end_idx = extract_completed_category(category_id)
        next unless items

        @saved_categories.add(category_id)
        save_category(category_id.to_sym, items)
        max_end_idx = [max_end_idx, end_idx].max
        Rails.logger.info("[PROGRESSIVE_SAVE] Saved category #{category_id} (#{items.length} items) during streaming")
      end

      # Trim processed portion of buffer to reduce memory
      return unless max_end_idx.positive?

      @text_buffer = @text_buffer[max_end_idx..]
    end

    def extract_completed_category(category_id)
      pattern = /"#{Regexp.escape(category_id)}"\s*:\s*\[/
      match = @text_buffer.match(pattern)
      return nil unless match

      start_idx = match.end(0)
      end_idx = find_array_end(@text_buffer, start_idx)
      return nil unless end_idx

      array_json = "[#{@text_buffer[start_idx...(end_idx - 1)]}]"
      [JSON.parse(array_json), end_idx]
    rescue JSON::ParserError
      nil
    end

    # Bracket-aware scanner that respects JSON strings
    def find_array_end(text, start_idx)
      bracket_count = 1
      in_string = false
      escape_next = false
      idx = start_idx

      while idx < text.length && bracket_count.positive?
        char = text[idx]

        if escape_next
          escape_next = false
        elsif in_string
          escape_next = true if char == "\\"
          in_string = false if char == '"'
        else
          case char
          when '"' then in_string = true
          when "[" then bracket_count += 1
          when "]" then bracket_count -= 1
          end
        end

        idx += 1
      end

      bracket_count.zero? ? idx : nil
    end

    def save_category(category_sym, items)
      items.each do |item|
        next unless item.is_a?(Hash) && item["title"].present?

        existing = @country.legislations.find_by(title: item["title"])
        parsed_date = parse_date(item["date_effective"])

        if existing
          next if !parsed_date || !existing.date_effective || parsed_date <= existing.date_effective

          new_leg = create_legislation(category_sym, item, parsed_date)
          LegislationContentExtractorJob.perform_async(new_leg.id)
          existing.update!(is_deprecated: true, replaced_by_id: new_leg.id)
          @saved_count += 1
          next
        end

        new_leg = create_legislation(category_sym, item, parsed_date)
        LegislationContentExtractorJob.perform_async(new_leg.id)
        @saved_count += 1
      end

      @emit_proc.call(:batch_saved, total_saved: @country.legislations.count) if @saved_count.positive?

      category_label = PromptBuilder::CATEGORIES[category_sym.to_s]
      return unless category_label && @parse_complete_emitted.exclude?(category_label)

      @emit_proc.call(:category_parse_complete, category: category_label, item_count: items.length)
      @parse_complete_emitted.add(category_label)
    end

    def create_legislation(category_sym, item, parsed_date)
      Legislation.create!(
        country_id: @country.id,
        category: Legislation.categories[category_sym],
        title: item["title"].to_s.strip,
        content: item["summary"].to_s,
        summary: item["summary"].to_s,
        source_url: item["source_url"].to_s,
        date_effective: parsed_date,
        is_deprecated: false,
        extraction_status: "pending",
        crawled_at: Time.current
      )
    end

    def parse_date(date_str)
      return nil if date_str.blank?

      Date.parse(date_str.to_s)
    rescue StandardError
      nil
    end
  end
end
