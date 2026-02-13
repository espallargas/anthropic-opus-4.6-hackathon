# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_02_13_013502) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "countries", force: :cascade do |t|
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.string "flag_emoji"
    t.datetime "last_crawled_at"
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_countries_on_code", unique: true
  end

  create_table "legislations", force: :cascade do |t|
    t.integer "category", null: false
    t.text "content", null: false
    t.bigint "country_id", null: false
    t.datetime "crawled_at", null: false
    t.datetime "created_at", null: false
    t.date "date_effective"
    t.boolean "is_deprecated", default: false, null: false
    t.bigint "replaced_by_id"
    t.string "source_url", null: false
    t.text "summary"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["country_id", "category"], name: "index_legislations_on_country_id_and_category"
    t.index ["country_id"], name: "index_legislations_on_country_id"
    t.index ["replaced_by_id"], name: "index_legislations_on_replaced_by_id"
  end

  add_foreign_key "legislations", "countries"
  add_foreign_key "legislations", "legislations", column: "replaced_by_id"
end
