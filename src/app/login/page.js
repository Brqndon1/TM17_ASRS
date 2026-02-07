import Image from 'next/image';

export default function LoginPage() {
    return (
      <div>
        {/* Orange bar at the top */}
        <div style={{ 
          width: '100%', 
          height: '110px', 
          backgroundColor: '#D9940B',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1000
        }}>
          <div style={{ position: 'absolute', top: '10px', left: '20px' }}>
            <Image 
              src="/asrs.png" 
              alt="Logo" 
              width={200} 
              height={200}
            />
          </div>
        </div>

        {/* Main content area */}
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          paddingTop: '60px'
        }}>
        <div style={{ 
          backgroundColor: 'white',
          padding: '40px', 
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{ marginBottom: '30px', color: 'black', scale: '2', textAlign: 'center' }}>Admin/Staff Login</h1>
          <form>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: 'black', marginBottom: '5px', fontWeight: '500' }}>
                Email:
              </label>
              <input 
                type="email" 
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '3px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px',
                  color: 'black'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: 'black', marginBottom: '5px', fontWeight: '500' }}>
                Password:
              </label>
              <input 
                type="password" 
                style={{ 
                  width: '100%', 
                  padding: '10px',
                  border: '3px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px',
                  color: 'black'
                }}
              />
            </div>
            <button 
              type="submit" 
              style={{ 
                width: '100%',
                padding: '12px', 
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
      </div>
    );
  }