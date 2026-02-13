class CreateLegislations < ActiveRecord::Migration[8.1]
  def change
    create_table :legislations do |t|
      t.references :country, null: false, foreign_key: true
      t.integer :category, null: false
      t.string :title, null: false
      t.text :content, null: false
      t.text :summary
      t.string :source_url, null: false
      t.date :date_effective
      t.boolean :is_deprecated, default: false, null: false
      t.references :replaced_by, foreign_key: { to_table: :legislations }
      t.datetime :crawled_at, null: false

      t.timestamps
    end

    add_index :legislations, [:country_id, :category]
  end
end
