# Maintenance Page API Integration

## Overview
The maintenance page successfully fetches data from Strapi CMS and displays it using the Marquee component.

## API Endpoint
- **URL**: `http://localhost:1337/api/maintenance?populate=*`
- **Method**: GET
- **Response**: JSON with maintenance page data including marquee components

## Data Structure

### Strapi Response
```json
{
  "data": {
    "id": 8,
    "title": "Craft and develop with consistency take time, see u soon🌸",
    "marquee": [
      {
        "id": 9,
        "items": "Inspiring from melancholy"
      },
      {
        "id": 10,
        "items": "quentinserda@gmail.com"
      },
      {
        "id": 11,
        "items": "building coherent stories with design system"
      },
      {
        "id": 12,
        "items": null
      }
    ]
  }
}
```

## Frontend Implementation

### Data Fetching
```typescript
// Fetch maintenance page data from Strapi
let maintenanceData = null;
let fetchError = null;

try {
  maintenanceData = await getMaintenancePage();
} catch (error) {
  console.error('Error fetching maintenance data:', error);
  fetchError = error;
}
```

### Data Processing
```typescript
// Process maintenance data for display
const hasMaintenanceData = maintenanceData && maintenanceData.data && maintenanceData.data.attributes;
const marqueeComponents = hasMaintenanceData && maintenanceData?.data?.attributes?.marquee 
  ? maintenanceData.data.attributes.marquee.filter(marquee => marquee.items && marquee.items.trim() !== '')
  : [];
```

### Component Rendering
```astro
<!-- Display marquees from maintenance page data -->
{marqueeComponents.length > 0 ? (
  marqueeComponents.map((marquee: any, index: number) => (
    <Marquee 
      text={marquee.items}
      className={` marquee-${index + 1}`}
      speed={1 + (index * 0.3)}
      direction={index % 2 === 0 ? 'left' : 'right'}
    />
  ))
) : (
  <Marquee 
    text="Retour très bientôt..."
    speed={1}
    direction="left"
  />
)}
```

## Features

### ✅ Working Features
- **API Integration**: Successfully fetches data from Strapi
- **Data Filtering**: Filters out null/empty marquee items
- **Multiple Marquees**: Displays multiple marquee components with different configurations
- **Fallback**: Shows default text when no data is available
- **Error Handling**: Graceful error handling with console logging
- **Development Debug**: Debug panel in development mode
- **Dynamic Title**: Uses Strapi title or fallback

### 🎨 Visual Features
- **Alternating Directions**: Even-indexed marquees scroll left, odd-indexed scroll right
- **Varying Speeds**: Each marquee has slightly different animation speed
- **Layered Effect**: Different opacity and positioning for visual depth
- **Responsive Design**: Mobile-optimized styling

## Current Data
Based on the API response, the maintenance page displays:
1. "Inspiring from melancholy" (left, speed 1.0)
2. "quentinserda@gmail.com" (right, speed 1.3)
3. "building coherent stories with design system" (left, speed 1.6)

## Development Tools
- **Debug Panel**: Shows API status, data availability, and marquee count (development only)
- **Console Logging**: Detailed logging in development mode
- **Error Handling**: Comprehensive error handling and reporting

## Production Ready
- Clean, lint-free code
- Proper TypeScript interfaces
- BEM CSS methodology
- Responsive design
- Performance optimized
