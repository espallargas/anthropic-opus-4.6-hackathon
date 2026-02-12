import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { countryCentroids } from '@/lib/countries'
import type { SystemVars } from '@/hooks/useChat'

interface SetupFormProps {
  onSubmit: (vars: SystemVars) => void
  defaultValues?: SystemVars
}

export function SetupForm({ onSubmit, defaultValues }: SetupFormProps) {
  const [originCountry, setOriginCountry] = useState(defaultValues?.origin_country ?? '')
  const [nationality, setNationality] = useState(defaultValues?.nationality ?? '')
  const [destinationCountry, setDestinationCountry] = useState(
    defaultValues?.destination_country ?? '',
  )
  const [objective, setObjective] = useState(defaultValues?.objective ?? '')
  const [additionalInfo, setAdditionalInfo] = useState(defaultValues?.additional_info ?? '')

  // Get sorted country list for dropdowns
  const countryOptions = Object.entries(countryCentroids)
    .map(([code, data]) => ({ code, ...data }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const canSubmit =
    originCountry.trim() && nationality.trim() && destinationCountry.trim() && objective.trim()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      origin_country: originCountry.trim(),
      nationality: nationality.trim(),
      destination_country: destinationCountry.trim(),
      objective: objective.trim(),
      additional_info: additionalInfo.trim(),
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Assistente de Imigração</CardTitle>
          <CardDescription>
            Preencha seus dados para receber orientações personalizadas sobre seu processo de
            imigração.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="origin_country">País de origem</Label>
              <Select value={originCountry} onValueChange={setOriginCountry}>
                <SelectTrigger id="origin_country">
                  <SelectValue placeholder="Selecione seu país de origem" />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="nationality">Nacionalidade</Label>
              <Input
                id="nationality"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="Ex: Brasileira"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="destination_country">País de destino</Label>
              <Select value={destinationCountry} onValueChange={setDestinationCountry}>
                <SelectTrigger id="destination_country">
                  <SelectValue placeholder="Selecione seu país de destino" />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="objective">Tipo de visto / objetivo</Label>
              <Input
                id="objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Ex: Trabalho, estudo, residência permanente"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="additional_info">Informações adicionais (opcional)</Label>
              <Textarea
                id="additional_info"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Contexto adicional que possa ajudar nas respostas..."
                rows={3}
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              Iniciar chat
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
