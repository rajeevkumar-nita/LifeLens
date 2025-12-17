
// module.exports = {
//   content: [
//     "./src/**/*.{js,jsx,ts,tsx}",
//     "./public/index.html",
//     ],
//     theme: {
//         extend: {
//             colors: {
//                 primary: '#1DA1F2',
//                 secondary: '#14171A',
//                 accent: '#657786',
//                 background: '#F5F8FA',
//                 text: '#292F33',
//             },
//         },
//     },
//     plugins: [],
// }



export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
}
