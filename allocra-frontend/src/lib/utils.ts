export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const e = error as { response?: { data?: { detail?: string } } }
    return e.response?.data?.detail || 'Something went wrong'
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function generateDisplayId(name: string): string {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2).padEnd(2, 'X')
  const num = Math.floor(Math.random() * 99999999).toString().padStart(8, '0')
  return `${initials}${num}`
}

/** Clamp a number between min and max */
export function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

/** Inclusive list of all known skills for the dropdown */
export const KNOWN_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular',
  'Node.js', 'Express', 'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Laravel',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD', 'DevOps',
  'GraphQL', 'REST API', 'gRPC', 'WebSockets',
  'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch', 'Pandas', 'SQL',
  'React Native', 'Flutter', 'iOS', 'Android', 'Swift', 'Kotlin',
  'UI/UX Design', 'Figma', 'Product Management', 'Agile', 'Scrum',
  'Go', 'Rust', 'Java', 'C++', 'C#', '.NET', 'Ruby', 'PHP', 'Scala',
  'Blockchain', 'Solidity', 'Web3',
  'Git', 'Linux', 'Nginx', 'System Design', 'Microservices',
]
