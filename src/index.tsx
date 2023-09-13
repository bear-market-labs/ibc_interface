import { ColorModeScript, createStandaloneToast } from "@chakra-ui/react"
import * as React from "react"
import * as ReactDOM from "react-dom/client"
import { HashRouter } from "react-router-dom"
import { App } from "./App"
import reportWebVitals from "./reportWebVitals"
import * as serviceWorker from "./serviceWorker"

const { ToastContainer } = createStandaloneToast()

const container = document.getElementById("root")
if (!container) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(container)

localStorage.setItem('chakra-ui-color-mode', 'dark')

root.render(
  <React.StrictMode>
    <HashRouter>
      <ColorModeScript initialColorMode={'dark'} />
      <ToastContainer />
      <App />
    </HashRouter>
  </React.StrictMode>,
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorker.unregister()

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()

