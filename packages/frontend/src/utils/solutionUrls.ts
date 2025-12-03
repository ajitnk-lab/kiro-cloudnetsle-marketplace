// Solution URL mapping and token generation
export const SOLUTION_URLS: Record<string, string> = {
  'aws-solution-finder-001': 'https://awssolutionfinder.solutions.cloudnestle.com',
  'faiss': 'https://awssolutionfinder.solutions.cloudnestle.com',
  'aws-finder': 'https://awssolutionfinder.solutions.cloudnestle.com'
}

export interface SolutionAccess {
  solutionId: string
  token: string
  userEmail: string
  tier: string
}

export function generateSolutionUrl(access: SolutionAccess): string {
  const baseUrl = SOLUTION_URLS[access.solutionId] || `https://solution-${access.solutionId}.example.com`
  
  const params = new URLSearchParams({
    token: access.token,
    user_email: access.userEmail,
    tier: access.tier,
    user_id: access.userEmail // For backward compatibility
  })
  
  return `${baseUrl}?${params.toString()}`
}

export function getSolutionBaseUrl(solutionId: string): string {
  return SOLUTION_URLS[solutionId] || `https://solution-${solutionId}.example.com`
}

// Store solution token in localStorage for later use
export function storeSolutionToken(solutionId: string, token: string): void {
  localStorage.setItem(`solution_token_${solutionId}`, token)
}

// Get solution token from localStorage
export function getSolutionToken(solutionId: string): string | null {
  return localStorage.getItem(`solution_token_${solutionId}`)
}
