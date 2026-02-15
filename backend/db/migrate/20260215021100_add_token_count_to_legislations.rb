class AddTokenCountToLegislations < ActiveRecord::Migration[8.1]
  def change
    add_column :legislations, :token_count, :integer
  end
end
