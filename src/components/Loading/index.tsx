import './index.css'

const Loading: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex h-screen items-center justify-center backdrop-blur-sm dark:bg-black/10">
      <div className="loader-ui"></div>
    </div>
  )
}

export default Loading
