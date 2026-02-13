class CreateCountries < ActiveRecord::Migration[8.1]
  def change
    create_table :countries do |t|
      t.string :code, null: false
      t.string :name, null: false
      t.string :flag_emoji
      t.datetime :last_crawled_at

      t.timestamps
    end

    add_index :countries, :code, unique: true
  end
end
