export default function Card({ as = 'section', className = '', children, ...props }) {
  const Tag = as
  return (
    <Tag className={`min-w-0 rounded-card border border-line bg-surface shadow-card ${className}`} {...props}>
      {children}
    </Tag>
  )
}
