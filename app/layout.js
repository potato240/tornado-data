export const metadata = {
  title: 'Tornado Data Explorer',
  description: 'Explore NOAA tornado data from the Storm Events Database',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#fff' }}>
        {children}
      </body>
    </html>
  );
}
