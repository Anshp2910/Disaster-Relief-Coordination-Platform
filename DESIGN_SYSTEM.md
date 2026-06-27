# Design System
> Version: 1.0
> Project: Disaster Relief Coordination Platform
> Last Updated: 2026-06-26

## Vision
Create a premium government-grade platform inspired by Palantir, Vercel,
Apple HIG, and modern GIS platforms.

**Design Goals:**
- Fast
- Mission critical
- Trustworthy
- Accessible
- Data-driven
- Responsive
- Enterprise quality

## Design Principles
- **Information First** – Clear visibility of critical data
- **Zero Visual Clutter** – High signal-to-noise ratio
- **Real-time by Default** – Live status indicators
- **High Contrast** – Mission-critical readability
- **Consistent Components** – Reusable building blocks
- **Smooth Motion** – Professional animations
- **Accessible (WCAG AA)** – Universal usability
- **Mobile + Desktop** – Seamless experience
- **Government-grade Reliability** – No compromises

## Color System

### Primary
| Token | Color |
|-------|-------|
| primary | #2563EB |
| primary-hover | #1D4ED8 |
| secondary | #0EA5E9 |
| accent | #06B6D4 |

### Status
| Status | Color |
|--------|-------|
| success | #22C55E |
| warning | #F59E0B |
| danger | #EF4444 |
| info | #38BDF8 |

### Background
| Token | Color |
|-------|-------|
| background | #07111F |
| surface | #101827 |
| elevated | #172554 |
| card | rgba(255,255,255,0.08) |

## Typography

### Font Stack
- **Inter** (Primary font)
- **Manrope** (Secondary)
- **Geist** (UI accent)
- **Satoshi** (Content)

### Scale
| Size | Token | Example |
|------|-------|---------|
| Display | --heading-display | 48px |
| H1 | --heading-1 | 36px |
| H2 | --heading-2 | 30px |
| H3 | --heading-3 | 24px |
| H4 | --heading-4 | 20px |
| Body | --text-body | 16px |
| Small | --text-sm | 14px |

### Line Heights
| Token | Value |
|-------|-------|
| leading-none | 1 |
| leading-tight | 1.2 |
| leading-snug | 1.35 |
| leading-normal | 1.5 |
| leading-relaxed | 1.625 |
| leading-loose | 2 |

### Font Weights
| Token | Weight |
|-------|--------|
| font-weight-light | 300 |
| font-weight-regular | 400 |
| font-weight-medium | 500 |
| font-weight-semibold | 600 |
| font-weight-bold | 700 |
| font-weight-extrabold | 800 |

### Tracking
| Token | Value |
|-------|-------|
| tracking-tighter | -0.04em |
| tracking-tight | -0.025em |
| tracking-normal | 0 |
| tracking-wide | 0.04em |
| tracking-wider | 0.08em |
| tracking-widest | 0.12em |

## Layout

### Structure
- **Left Sidebar**: 280px fixed width
- **Top Command Bar**: 72px fixed height
- **Content Area**: Flexible width

### Grid System
- **Column Count**: 12
- **Gutter**: 32px
- **Max Width**: 1600px
- **Max Width with Sidebar**: 1280px

### Spacing System (8px base)
| Token | Value |
|-------|-------|
| --space-4xs | 2px |
| --space-3xs | 4px |
| --space-2xs | 6px |
| --space-xs | 8px |
| --space-sm | 16px |
| --space-md | 24px |
| --space-lg | 32px |
| --space-xl | 48px |
| --space-2xl | 64px |
| --space-3xl | 96px |
| --space-4xl | 128px |

### Section Spacing
- **Section Top/Bottom**: 48px (--space-xl)
- **Widget Spacing**: 24px (--space-md)
- **Inline Spacing**: 16px (--space-sm)

## Live GIS Map

### Base Layers
- **Satellite** (Default)
- **Terrain**
- **Roads**
- **Rivers**

### Overlay Layers
- **Flood**
- **Cyclone**
- **Earthquake**
- **Hospitals**
- **Shelters**
- **Resources**
- **Volunteers**
- **NGOs**

### Interactive Features
- **Pulsing SOS**: Animated marker for emergency locations
- **Animated routes**: Tracked vehicle paths
- **Radar sweep**: Scanning mode
- **Cluster markers**: Grouped incidents
- **Geofencing**: Custom boundaries

## Incident Center

### Card Components
Each incident card shows:
- **Severity**: Red/Yellow/Green indicator
- **Status**: Open/Active/Resolved
- **Time**: Elapsed time
- **Location**: Coordinates/name
- **Assigned Team**: Team badges
- **ETA**: Estimated resolution
- **Resources**: Available/needed
- **Attachments**: Documents/links
- **Actions**: Quick buttons

### Actions
- **Assign**
- **Escalate**
- **Close**
- **Navigate**
- **Chat**

## Resource Management

### Categories
- **Food**
- **Water**
- **Medicine**
- **Blankets**
- **Fuel**
- **Vehicles**
- **Equipment**

### Display Elements
- **Stock**: Current quantity
- **Capacity**: Maximum storage
- **Consumption**: Usage rate
- **Trend**: Historical data
- **Forecast**: Future needs

### Quality Indicators
- **Green**: Sufficient
- **Yellow**: Moderate
- **Red**: Critical

## Volunteer Module

### Profile
- **Live availability**: Current status
- **Current assignment**: Active tasks
- **Skills**: Certified abilities
- **Certifications**: Badge display

### Operations
- **Check-in**: GPS location tracking
- **Attendance**: Shift logging
- **Assignments**: Task allocation
- **Performance**: Rating system

## AI Intelligence

### Widget Types
1. **Disaster Risk Score**
   - Multi-factor calculation
   - Real-time updates
   - Historical comparison

2. **Population Impact**
   - Affected areas
   - Population metrics
   - Resource needs

3. **Resource Prediction**
   - Demand forecasting
   - Supply chain
   - Allocation optimization

4. **AI Recommendations**
   - Action suggestions
   - Resource allocation
   - Response strategies

5. **Route Optimization**
   - Fastest paths
   - Traffic conditions
   - Resource distribution

6. **Weather Analysis**
   - Predictive modeling
   - Pattern recognition
   - Alert thresholds

## Notification Center

### Types
- **Emergency**
- **Warning**
- **Success**
- **Information**
- **Support**

### Channels
- **Toast**
- **Inbox**
- **Push**
- **Email**

### Behavior
- **Auto-dismiss**: 5 seconds
- **Priority ordering**: Critical first
- **Read status**: Tracked

## Tables

### Required Features
- **Search**: Real-time filtering
- **Filters**: Multi-column
- **Pagination**: 10/20/50/page
- **Sorting**: Clickable headers
- **Sticky Header**: Column persistence
- **Export CSV**
- **Bulk Actions**

### Data Rendering
- **Virtual scrolling**: Large datasets
- **Row selection**: Checkbox support
- **Action column**: Contextual menus

## Forms

### Requirements
- **Floating labels**
- **Validation**
- **Inline errors**
- **Success states**
- **Drag & Drop uploads**
- **Autosave**
- **Form persistence**

### Field Types
- **Text**
- **Search**
- **Select**
- **Date**
- **Upload**
- **OTP**

### Validation
- **Real-time**
- **Server validation**
- **Success feedback**
- **Error messages**

## Authentication

### Pages
1. **Login**
2. **Register**
3. **Forgot Password**
4. **Reset Password**

### Features
- **Glass card**
- **Split layout**
- **Security badges**
- **Password strength**
- **Two-factor auth**
- **Single sign-on**

## Motion

### Animations
- **Fade**: 200ms
- **Scale**: 150ms
- **Slide**: 200ms
- **Bounce**: 300ms (feedback)

### Framer Motion
- **Page transitions**: Slide + fade
- **List animations**: Staggered
- **Hover states**: Scale + shadow
- **Focus indicators**: Glow effects

### Duration
- **Fast**: 150ms
- **Normal**: 200-300ms
- **Slow**: 500ms
- **Entrance**: Staggered (100ms)

## Accessibility

### WCAG AA Compliance
- **Keyboard navigation**: Full tab order
- **Screen reader labels**: Descriptive text
- **Focus indicators**: High contrast
- **Color contrast**: 4.5:1 minimum
- **Reduced motion**: Support for prefers-reduced-motion

### Features
- **Skip navigation**: Main content link
- **ARIA labels**: Semantic structure
- **Live regions**: Real-time updates
- **High contrast modes**: Two schemes
- **Font scaling**: Adjustable text

## Performance

### Targets
- **Lighthouse**: >95
- **LCP**: <2.5s
- **CLS**: <0.1
- **FID**: <100ms

### Techniques
- **Lazy loading**: Offscreen images
- **Code splitting**: Route-based
- **Tree shaking**: Bundle optimization
- **Image optimization**: WebP + compression

## Component Library

### Buttons
- **Primary**: Dark blue gradient
- **Secondary**: Transparent dark
- **Ghost**: No background
- **Danger**: Red gradient
- **Icon**: Square with icon

### Cards
- **KPI**: Minimal design
- **Analytics**: Chart + metrics
- **Incident**: Status indicators
- **Weather**: Icon + values
- **Volunteer**: Profile + actions
- **Resource**: Stock + capacity

### Dialogs
- **Confirm**: Yes/Cancel
- **Warning**: Alert + options
- **Success**: Check + message
- **Error**: Alert + details

### Inputs
- **Text**
- **Search**
- **Select**
- **Date**
- **Upload**
- **OTP**

### Charts
- **Area**
- **Bar**
- **Line**
- **Pie**
- **Heatmap**

## Empty States

### Pattern
Each page must have:
- **Illustration**: Contextual graphic
- **Helpful message**: Clear explanation
- **Primary CTA**: Main action
- **Secondary CTA**: Alternative action
- **Back navigation**: Go back/home

## Loading States

### Design Principles
- **Skeleton cards**: 3 lines + shimmer
- **Skeleton tables**: Headers + rows
- **Skeleton map**: Placeholder
- **Progress bars**: Indeterminate
- **Never use plain spinners alone**

## Responsive

### Breakpoints
| Size | Min Width |
|------|----------|
| xs | 320px |
| sm | 375px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1440px |
| 3xl | 1920px |

### Mobile Considerations
- **Touch targets**: 44px minimum
- **Swiper controls**: Thumb-friendly
- **Form inputs**: Full-width on mobile
- **Navigation**: Bottom tab bar

## Quality Checklist

### Must-Have
- No console errors
- No broken routes
- No inconsistent spacing
- No inaccessible controls
- Responsive everywhere
- Smooth animations

### Enterprise Requirements
- **Visual quality**: No pixelated assets
- **Component consistency**: All matches
- **Data accuracy**: Real-time sync
- **Performance**: >95 Lighthouse
- **Security**: Encrypted transport

## Inspiration Sources

- Palantir Gotham (Enterprise intelligence)
- Apple Vision Pro (Spatial UI)
- Vercel (Developer experience)
- Linear (Modern interface)

## Final Goal

The application should look and feel like a **premium government-grade disaster relief platform** used for real-time disaster response.

The design system serves as the foundation for building a **mission-critical,
high-performance, and visually cohesive** disaster relief coordination platform
that professionals can trust in life-or-death situations.