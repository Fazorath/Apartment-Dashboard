import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Building2, Database, LogOut, RefreshCw, Shield, Users } from 'lucide-react'
import useAuth from '../hooks/useAuth'
import Card from './ui/Card'
import Button from './ui/Button'
import Segmented from './ui/Segmented'
import Avatar from './ui/Avatar'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'homes', label: 'Homes' },
  { value: 'users', label: 'Users' },
  { value: 'databases', label: 'Databases' },
]

const CONNECTION = {
  1: { text: 'Connected', className: 'text-accent' },
  2: { text: 'Connecting', className: 'text-warning' },
  3: { text: 'Disconnecting', className: 'text-warning' },
}
const connection = (status) => CONNECTION[status] || { text: 'Disconnected', className: 'text-danger' }

const formatDate = (date) => (date ? new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never')

function Stat({ icon, label, value }) {
  const Icon = icon
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="grid h-10 w-10 place-items-center rounded-ctl bg-surface-2 text-muted"><Icon size={20} /></span>
      <span>
        <span className="block text-xs font-medium text-muted">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </span>
    </Card>
  )
}

function PeopleList({ title, people, dateKey }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {people?.length ? (
        <ul className="grid">
          {people.map((person, i) => (
            <li key={`${person.username}-${i}`} className="flex items-center gap-3 py-2.5 [&+li]:border-t [&+li]:border-line">
              <Avatar name={person.username} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{person.username}</span>
                <span className="text-xs text-subtle">{person.apartmentCode}</span>
              </span>
              <span className="text-xs text-muted tabular-nums">{formatDate(person[dateKey])}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">No activity yet.</p>}
    </Card>
  )
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState('overview')
  const [apartments, setApartments] = useState([])
  const [databaseStatus, setDatabaseStatus] = useState(null)
  const [stats, setStats] = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAdminData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [apartmentsRes, dbRes, statsRes] = await Promise.all([
        axios.get('/api/admin/apartments'),
        axios.get('/api/admin/database-status'),
        axios.get('/api/admin/stats'),
      ])
      setApartments(apartmentsRes.data.apartments)
      setDatabaseStatus(dbRes.data)
      setStats(statsRes.data.stats)
    } catch (err) {
      console.error('Admin data fetch error:', err)
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAdminData() }, [fetchAdminData])

  const selectHome = async (code) => {
    try {
      const response = await axios.get(`/api/admin/apartment/${code}`)
      setSelected(response.data.apartment)
    } catch (err) {
      console.error('Apartment details fetch error:', err)
    }
  }

  const allUsers = apartments.flatMap((apt) => (apt.users || []).map((u) => ({ ...u, apartmentCode: u.apartmentCode || apt.code })))

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 lg:px-8">
          <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-ink text-bg"><Shield size={18} /></div>
          <div className="min-w-0">
            <p className="text-[17px] leading-[22px] font-bold tracking-tight">Admin</p>
            <p className="text-xs text-subtle">Roommate Dash · signed in as {user?.username}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" onClick={fetchAdminData} loading={loading} aria-label="Refresh">{loading ? null : <RefreshCw size={16} />}<span className="max-sm:hidden">Refresh</span></Button>
            <Button variant="secondary" onClick={logout}><LogOut size={16} /> <span className="max-sm:hidden">Sign out</span></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1200px] gap-5 px-4 pt-7 pb-16 lg:px-8">
        <Segmented options={TABS} value={tab} onChange={setTab} label="Admin sections" className="justify-self-start" />

        {error ? (
          <Card className="px-5 py-7 text-center">
            <p className="mb-1 text-[15px] font-medium">Couldn’t load admin data</p>
            <p className="text-muted">{error}</p>
            <Button variant="secondary" className="mt-3" onClick={fetchAdminData}><RefreshCw size={16} /> Try again</Button>
          </Card>
        ) : loading && !stats ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <>
            {tab === 'overview' ? (
              <div className="grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat icon={Building2} label="Homes" value={stats?.totalApartments || 0} />
                  <Stat icon={Users} label="Users" value={stats?.totalUsers || 0} />
                  <Stat icon={Shield} label="Admins" value={stats?.totalAdmins || 0} />
                  <Stat icon={Database} label="Open databases" value={databaseStatus?.totalConnections || 0} />
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <PeopleList title="Newest users" people={stats?.recentUsers} dateKey="createdAt" />
                  <PeopleList title="Recent sign-ins" people={stats?.recentLogins} dateKey="lastLogin" />
                </div>
              </div>
            ) : null}

            {tab === 'homes' ? (
              <div className="grid items-start gap-5 lg:grid-cols-2">
                <Card className="p-2">
                  {apartments.map((apt) => (
                    <button
                      key={apt.code}
                      type="button"
                      aria-pressed={selected?.code === apt.code}
                      onClick={() => selectHome(apt.code)}
                      className={`flex w-full items-center gap-3 rounded-ctl px-3 py-3 text-left ${selected?.code === apt.code ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{apt.name}</span>
                        <span className="text-xs text-subtle tabular-nums">{apt.code} · {apt.totalUsers} {apt.totalUsers === 1 ? 'user' : 'users'}</span>
                      </span>
                      <span className="text-xs text-muted">{formatDate(apt.createdAt)}</span>
                    </button>
                  ))}
                </Card>
                <Card className="p-5">
                  {selected ? (
                    <div className="grid gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">{selected.name}</h2>
                        <p className="text-muted tabular-nums">{selected.code} · {selected.users?.length || 0} users · {selected.tasks?.length || 0} chores</p>
                      </div>
                      <ul className="grid">
                        {selected.users?.map((u) => (
                          <li key={u.id} className="flex items-center gap-3 py-2.5 [&+li]:border-t [&+li]:border-line">
                            <Avatar name={u.username} />
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{u.username}{u.isAdmin ? <span className="ml-2 rounded-pill bg-surface-2 px-1.5 py-0.5 text-xs text-muted">Admin</span> : null}</span>
                              <span className="text-xs text-subtle">Last sign-in {formatDate(u.lastLogin)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      {selected.tasks?.length ? (
                        <div>
                          <h3 className="mb-2 text-xs font-semibold text-muted">Chores</h3>
                          <ul className="grid gap-1">
                            {selected.tasks.map((task) => (
                              <li key={task.id} className="flex justify-between gap-3 rounded-ctl bg-surface-2 px-3 py-2 text-sm">
                                <span className="truncate">{task.name}</span>
                                <span className="text-muted">{task.assignedTo || 'Unassigned'} · every {task.frequencyDays}d</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : <p className="text-muted">Select a home to see its members and chores.</p>}
                </Card>
              </div>
            ) : null}

            {tab === 'users' ? (
              <Card className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-line text-xs text-muted">
                    <tr>
                      {['User', 'Home', 'Created', 'Last sign-in', 'Role'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.id} className="border-t border-line first:border-t-0 hover:bg-surface-2">
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-3">
                            <Avatar name={u.username} />
                            <span><span className="block font-medium">{u.username}</span>{u.email ? <span className="text-xs text-subtle">{u.email}</span> : null}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3 tabular-nums">{u.apartmentCode}</td>
                        <td className="px-5 py-3 text-muted tabular-nums">{formatDate(u.createdAt)}</td>
                        <td className="px-5 py-3 text-muted tabular-nums">{formatDate(u.lastLogin)}</td>
                        <td className="px-5 py-3"><span className="rounded-pill bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">{u.isAdmin ? 'Admin' : 'Member'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ) : null}

            {tab === 'databases' ? (
              <Card className="p-5">
                <ul className="grid">
                  <li className="flex items-center justify-between py-2.5">
                    <span><span className="block font-medium">Main database</span><span className="text-xs text-subtle">apartment-dashboard</span></span>
                    <span className={`text-sm font-medium ${connection(databaseStatus?.mainDatabase?.status).className}`}>{connection(databaseStatus?.mainDatabase?.status).text}</span>
                  </li>
                  {databaseStatus?.apartmentDatabases?.map((db) => (
                    <li key={db.apartmentCode} className="flex items-center justify-between border-t border-line py-2.5">
                      <span><span className="block font-medium tabular-nums">{db.apartmentCode}</span><span className="text-xs text-subtle">{db.databaseName}</span></span>
                      <span className={`text-sm font-medium ${connection(db.status).className}`}>{connection(db.status).text}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}
