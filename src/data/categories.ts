import { CategoryDefinition } from '../types';

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: 1,
    name: 'Video Surveillance & Cameras',
    slug: 'video-surveillance-cameras',
    description: 'Enterprise IP cameras, thermal imaging, PTZ, explosion-proof, panoramic, and specialized surveillance units.',
    iconName: 'Camera',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Box Cameras',
      'Bullet Cameras',
      'Dome Cameras',
      'PTZ Cameras',
      'Panoramic Cameras',
      'Fisheye Cameras',
      'Thermal Cameras',
      'Multisensor Cameras',
      'Network Cameras',
      'Explosion-Proof Cameras',
      'Specialty Cameras',
      'Camera Bundles'
    ]
  },
  {
    id: 2,
    name: 'Video Management & Recording',
    slug: 'video-management-recording',
    description: 'Network Video Recorders (NVR), intelligent video analytics, AI edge servers, encoders, and dedicated monitoring workstations.',
    iconName: 'Server',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Network Video Recorders (NVR)',
      'Video Management Software (VMS)',
      'Video Analytics',
      'AI Analytics',
      'Video Encoders',
      'Video Decoders',
      'Recording Servers',
      'Video Storage',
      'Video Workstations'
    ]
  },
  {
    id: 3,
    name: 'Access Control & Door Security',
    slug: 'access-control-door-security',
    description: 'Biometric terminals, RFID smart cards, controllers, electromagnetic locks, visitor management systems.',
    iconName: 'ShieldCheck',
    image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Access Control Panels',
      'Door Controllers',
      'Access Control Readers',
      'Card Readers',
      'Biometric Readers',
      'Smart Cards',
      'Key Fobs',
      'Access Credentials',
      'Electronic Locks',
      'Wireless Locks',
      'Door Hardware',
      'Visitor Management',
      'Access Control Software',
      'Access Control Accessories'
    ]
  },
  {
    id: 4,
    name: 'Intercom & IP Communication',
    slug: 'intercom-ip-communication',
    description: 'Commercial video door stations, indoor touch stations, master consoles, SIP phones, and emergency stations.',
    iconName: 'PhoneCall',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'IP Intercoms',
      'Video Intercoms',
      'Audio Intercoms',
      'Door Stations',
      'Indoor Stations',
      'Master Stations',
      'IP Phones',
      'Emergency Communication',
      'Intercom Accessories'
    ]
  },
  {
    id: 5,
    name: 'Networking & Connectivity',
    slug: 'networking-connectivity',
    description: 'High-throughput enterprise PoE switches, industrial DIN-rail switches, Wi-Fi 6/7 access points, and gigabit routers.',
    iconName: 'Network',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Network Switches',
      'Managed Switches',
      'Unmanaged Switches',
      'PoE Switches',
      'Industrial Switches',
      'Routers',
      'Wireless Access Points',
      'Wi-Fi Equipment',
      'Network Adapters',
      'Network Accessories'
    ]
  },
  {
    id: 6,
    name: 'Security Sensors & Detection',
    slug: 'security-sensors-detection',
    description: 'PIR motion detectors, microwave radar perimeter sensors, environmental monitoring, and acoustic glass-break detectors.',
    iconName: 'Radio',
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Motion Sensors',
      'Intrusion Sensors',
      'Perimeter Sensors',
      'Radar Sensors',
      'Environmental Sensors',
      'Occupancy Sensors',
      'Audio Detection',
      'Emergency Sensors'
    ]
  },
  {
    id: 7,
    name: 'Public Address (PAGA) System',
    slug: 'public-address-paga-system',
    description: 'IP network speakers, high-decibel horn speakers, zone amplifiers, paging microphones, and emergency broadcast controllers.',
    iconName: 'Megaphone',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Network Speakers',
      'IP Speakers',
      'Horn Speakers',
      'Ceiling Speakers',
      'Wall Speakers',
      'Amplifiers',
      'Microphones',
      'Audio Controllers',
      'Public Address Systems',
      'Emergency Audio Systems',
      'Audio Accessories'
    ]
  },
  {
    id: 8,
    name: 'Security Software & Licenses',
    slug: 'security-software-licenses',
    description: 'Enterprise VMS license tiers, AI deep learning packages, cloud connectivity tokens, and integration API packs.',
    iconName: 'FileCode',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Video Management Software',
      'Access Control Software',
      'Analytics Software',
      'AI Software',
      'Cloud Software',
      'Software Licenses',
      'Subscription Licenses',
      'Feature Licenses',
      'Integration Licenses'
    ]
  },
  {
    id: 9,
    name: 'Storage & Data Infrastructure',
    slug: 'storage-data-infrastructure',
    description: 'Enterprise SAS/SATA surveillance hard drives, SAN/NAS storage arrays, high-density storage servers, and expansion shelves.',
    iconName: 'HardDrive',
    image: 'https://images.unsplash.com/photo-1597852074816-d933c4d2b988?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Network Storage',
      'Video Storage',
      'Storage Servers',
      'Hard Drives',
      'Storage Expansion',
      'Storage Appliances',
      'Storage Accessories'
    ]
  },
  {
    id: 10,
    name: 'Power & Electrical Systems',
    slug: 'power-electrical-systems',
    description: 'Rackmount online UPS units, multi-channel CCTV power supply boxes, PoE injectors, and power distribution units (PDU).',
    iconName: 'Zap',
    image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Power Supplies',
      'PoE Power Supplies',
      'Power Adapters',
      'UPS Systems',
      'Batteries',
      'Backup Power',
      'Power Distribution',
      'Power Accessories'
    ]
  },
  {
    id: 11,
    name: 'Enclosures & Housings',
    slug: 'enclosures-housings',
    description: 'Heavy-duty explosion-proof camera enclosures, IP67 outdoor housings with wipers and heaters, corrosion-resistant junction boxes.',
    iconName: 'Box',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Camera Housings',
      'Outdoor Housings',
      'Indoor Housings',
      'Explosion-Proof Housings',
      'Environmental Housings',
      'Protective Enclosures',
      'Junction Enclosures',
      'Back Boxes',
      'Equipment Enclosures',
      'Mounting Enclosures'
    ]
  },
  {
    id: 12,
    name: 'Mounting & Surveillance Accessories',
    slug: 'mounting-surveillance-accessories',
    description: 'Precision pole mounts, pendant brackets, parapet mounts, corner brackets, sun shields, and weatherproof conduits.',
    iconName: 'Wrench',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Camera Mounts',
      'Wall Mounts',
      'Ceiling Mounts',
      'Pole Mounts',
      'Pendant Mounts',
      'Corner Mounts',
      'Mounting Brackets',
      'Sun Shields',
      'Junction Boxes',
      'Back Boxes',
      'Cables & Connectors',
      'Installation Accessories'
    ]
  },
  {
    id: 13,
    name: 'Lighting & Visual Deterrence',
    slug: 'lighting-visual-deterrence',
    description: 'Long-range infrared illuminators (up to 500m), white light strobe deterrents, perimeter LED floodlights, and light brackets.',
    iconName: 'Sun',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'IR Illuminators',
      'White Light Illuminators',
      'Security Lighting',
      'Camera Lighting',
      'LED Lighting',
      'Lighting Accessories'
    ]
  },
  {
    id: 14,
    name: 'Telecommunication & Communication Equipment',
    slug: 'telecommunication-communication-equipment',
    description: 'Point-to-point microwave backhaul links, UHF/VHF repeaters, satellite receivers, wireless bridge dishes, and telecom supervisory gear.',
    iconName: 'Antenna',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Microwave Radio',
      'Micro Radio',
      'UHF Equipment',
      'VHF Equipment',
      'Wireless Communication',
      'Backhaul Equipment',
      'Satellite Communication',
      'Telecom Supervisory Systems',
      'Radio Accessories',
      'Communication Accessories'
    ]
  },
  {
    id: 15,
    name: 'Accessories & Replacement Parts',
    slug: 'accessories-replacement-parts',
    description: 'Replacement camera lenses, PTZ slip rings, cooling fan assemblies, replacement PCB boards, modular surge protectors.',
    iconName: 'Cpu',
    image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Camera Accessories',
      'Access Control Accessories',
      'Intercom Accessories',
      'Network Accessories',
      'Audio Accessories',
      'Power Accessories',
      'Mounting Accessories',
      'Replacement Parts',
      'Spare Parts',
      'Upgrade Kits'
    ]
  },
  {
    id: 16,
    name: 'Renewable Energy',
    slug: 'renewable-energy',
    description: 'High-voltage smart hybrid inverters, deep-cycle Lithium LiFePO4 rack batteries, and Tier-1 industrial monocrystalline solar panels.',
    iconName: 'BatteryCharging',
    image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=600&q=80',
    subcategories: [
      'Smart Hybrid Inverters',
      'Lithium LiFePO4 Batteries',
      'Industrial Solar Panels'
    ]
  }
];
