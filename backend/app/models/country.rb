class Country < ApplicationRecord
  has_many :legislations, dependent: :destroy

  validates :code, :name, presence: true
  validates :code, uniqueness: true
end
