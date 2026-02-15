class AddExtractionFieldsToLegislations < ActiveRecord::Migration[8.1]
  def change
    add_column :legislations, :extraction_status, :string, default: "pending", null: false
    add_column :legislations, :last_extracted_at, :datetime
    add_index :legislations, :extraction_status
  end
end
