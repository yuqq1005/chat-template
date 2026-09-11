import { ChatPage } from './components/ChatPage'

/** PC 端居中手机宽度；小屏仍全宽 */
export default function App() {
  return (
    <div className="app-shell-host">
      <div data-app-shell className="app-shell">
        <ChatPage />
      </div>
    </div>
  )
}
