import React from 'react'
// import ReactDOM from 'react-dom'
// import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from '@chakra-ui/react'

import './theme.css'
import App from './App';
import { HashRouter } from 'react-router-dom'
import theme from './theme'
import { createStandaloneToast } from '@chakra-ui/react'

const { ToastContainer } = createStandaloneToast()
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <HashRouter >
        <App />
        <ToastContainer />
      </HashRouter>
    </ChakraProvider>
  </React.StrictMode>
);  