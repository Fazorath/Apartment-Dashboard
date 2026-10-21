import Card from './ui/Card'
import Avatar from './ui/Avatar'
import { plural } from '../lib/taskStatus'

export default function RoommatesPanel({ people, selected, onSelect }) {
  return (
    <Card className="px-5 py-[18px] max-lg:px-4 max-lg:py-3.5">
      <h2 className="mb-3 flex items-center text-sm font-semibold max-sm:mb-2">
        Roommates
        <small className="ml-auto text-xs font-medium text-subtle max-sm:hidden">Select to filter</small>
      </h2>
      <div className="-mx-2 grid gap-0.5 max-lg:mx-0 max-lg:flex max-lg:gap-2 max-lg:overflow-x-auto max-lg:pb-1">
        {people.map((person) => {
          const isSelected = selected === person.name
          const percent = person.total ? Math.round((100 * person.doneThisWeek) / person.total) : 0
          return (
            <button
              key={person.name || 'unassigned'}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(isSelected ? null : person.name)}
              className={`grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-ctl p-2 text-left transition-colors duration-150 max-lg:w-auto max-lg:flex-none max-lg:grid-cols-[32px_auto_auto] max-lg:border max-lg:border-line ${
                isSelected ? 'bg-accent-soft' : 'hover:bg-surface-2'
              }`}
            >
              <Avatar name={person.name} size="md" />
              <span className="min-w-0">
                <span className="block font-medium">
                  {person.name || 'Unassigned'}
                  {person.isMe ? <span className="font-normal text-subtle"> (you)</span> : null}
                </span>
                <span className="text-xs text-subtle tabular-nums max-sm:hidden">
                  {plural(person.total, 'chore')} · {person.doneThisWeek} done this week
                </span>
                <span className="mt-1.5 block h-1 overflow-hidden rounded-sm bg-surface-2 max-lg:hidden">
                  <span className="block h-full rounded-sm bg-accent" style={{ width: `${percent}%` }} />
                </span>
              </span>
              {person.overdue ? (
                <span className="min-w-[68px] text-right text-xs font-medium text-danger tabular-nums max-lg:min-w-0">{person.overdue} overdue</span>
              ) : (
                <span className="min-w-[68px] text-right text-xs text-subtle max-lg:min-w-0">All clear</span>
              )}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
