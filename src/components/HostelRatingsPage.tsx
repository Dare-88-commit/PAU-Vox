import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiRequest } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface HostelRatingsPageProps {
  onNavigate: (page: string) => void
}

type HostelRating = {
  hostel: string
  response_count: number
  average_percent: number
  star_rating: number
}

export function HostelRatingsPage({ onNavigate }: HostelRatingsPageProps) {
  const { token } = useAuth()
  const [rows, setRows] = useState<HostelRating[]>([])

  useEffect(() => {
    const load = async () => {
      if (!token) return
      const data = await apiRequest<HostelRating[]>('/surveys/hostels/ratings', { token })
      setRows(data)
    }
    void load()
  }, [token])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Hostel Ratings</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {rows.map((item) => (
          <Card key={item.hostel}>
            <CardHeader>
              <CardTitle>{item.hostel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Responses: <strong>{item.response_count}</strong></p>
              <p>Average score: <strong>{item.average_percent}%</strong></p>
              <p>Rating: <strong>{item.star_rating} / 5</strong></p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
