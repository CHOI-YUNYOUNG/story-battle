import RoomEntry from './RoomEntry'

interface Props {
  params: Promise<{ code: string }>
}

export default async function RoomPage({ params }: Props) {
  const { code } = await params
  return <RoomEntry code={code.toUpperCase()} />
}
