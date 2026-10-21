import Card from './ui/Card'
import { addDays, daysBetween, getTaskStatus, SOON_DAYS } from '../lib/taskStatus'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function WeekStrip({ tasks, today }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i)
    const due = []
    tasks.forEach((task) => {
      const status = getTaskStatus(task, today)
      if (!status.dueDate) return
      const offset = daysBetween(today, status.dueDate)
      // Late chores pile onto today in red; the next two days are amber.
      if (i === 0 && offset <= 0) due.push({ id: task._id, tone: 'bg-danger' })
      else if (i > 0 && offset === i) due.push({ id: task._id, tone: i <= SOON_DAYS ? 'bg-warning' : 'bg-subtle/70' })
    })
    return { date, due }
  })

  return (
    <Card className="px-5 py-[18px] max-lg:px-4 max-lg:py-3.5">
      <h2 className="mb-3 text-sm font-semibold max-sm:mb-2">Next 7 days</h2>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map(({ date, due }, i) => (
          <div key={date.toISOString()} className={`grid justify-items-center gap-1.5 rounded-ctl pt-1.5 pb-2 ${i === 0 ? 'bg-surface-2' : ''}`}>
            <span className="text-xs font-medium text-subtle">{i === 0 ? 'Today' : WEEKDAYS[date.getDay()]}</span>
            <span className="text-[13px] font-semibold tabular-nums">{date.getDate()}</span>
            <span className="flex min-h-[7px] max-w-7 flex-wrap justify-center gap-[3px]" aria-label={`${due.length} due`}>
              {due.map((d) => <i key={d.id} className={`h-[7px] w-[7px] rounded-full ${d.tone}`} />)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-subtle max-sm:hidden">Each dot is a chore coming due. Red ones are already late.</p>
    </Card>
  )
}
