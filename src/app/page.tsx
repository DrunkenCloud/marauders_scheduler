import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to login page as per requirements
  redirect('/login')
}