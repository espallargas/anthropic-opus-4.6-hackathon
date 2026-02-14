class Legislation < ApplicationRecord
  belongs_to :country
  belongs_to :replaced_by, class_name: "Legislation", optional: true, inverse_of: :replacements
  has_many :replacements, class_name: "Legislation", foreign_key: "replaced_by_id", dependent: :nullify,
                          inverse_of: :replaced_by

  validates :title, :content, :source_url, presence: true
  validates :category, presence: true

  enum :category, {
    federal_laws: 0,
    regulations: 1,
    consular: 2,
    jurisdictional: 3,
    complementary: 4,
    auxiliary: 5
  }
end
