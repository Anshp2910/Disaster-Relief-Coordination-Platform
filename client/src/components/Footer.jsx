export default function Footer() {
  return (
    <footer className="gov-footer">
      <div className="gov-container">
        <div className="gov-footer-grid">
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/requests/new">New Request</a></li>
              <li><a href="/admin">Admin Panel</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li>Emergency Helpline: 112</li>
              <li>Disaster Helpline: 108</li>
              <li>Email: relief@gov.in</li>
              <li>National Disaster Management Authority</li>
            </ul>
          </div>
          <div>
            <h4>About</h4>
            <ul>
              <li>A platform for coordinating disaster relief efforts across India</li>
              <li>Connecting volunteers, NGOs, and agencies</li>
              <li>Built for National Disaster Management</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="gov-footer-bottom">
        <div className="gov-container">
          <span>© 2026 Disaster Relief Coordination Platform | Government of India Initiative</span>
          <span>Last Updated: June 2026</span>
        </div>
      </div>
    </footer>
  )
}
