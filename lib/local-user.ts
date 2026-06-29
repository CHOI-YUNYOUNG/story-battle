export type LocalUser = {
  userId: string
  nickname: string
}

export function getLocalUser(): LocalUser {
  if (typeof window === 'undefined') return { userId: '', nickname: '' }

  let userId = localStorage.getItem('sb-user-id')
  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem('sb-user-id', userId)
  }

  const nickname = localStorage.getItem('sb-nickname') || ''
  return { userId, nickname }
}

export function saveNickname(nickname: string) {
  localStorage.setItem('sb-nickname', nickname.trim())
}
