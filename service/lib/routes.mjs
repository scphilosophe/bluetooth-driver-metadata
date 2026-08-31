export const routes = [
  {
    key: 'current',
    name: 'Current Intel Bluetooth package',
    endOfLife: false,
    urls: [
      'https://www.intel.com/content/www/us/en/download/18649/intel-wireless-bluetooth-drivers-for-windows-10-and-windows-11.html',
      'https://www.intel.co.jp/content/www/jp/ja/download/18649/intel-wireless-bluetooth-drivers-for-windows-10-and-windows-11.html'
    ],
    models: [
      'BE213', 'BE211', 'BE202', 'BE201', 'BE200',
      'AX411', 'AX231', 'AX211', 'AX210', 'AX203', 'AX201', 'AX101',
      '9560', '9462', '9461', '9260',
      'BE1775', 'BE1750', 'AX1690', 'AX1675', 'AX1650', '1550'
    ],
    fallbackDriverVersions: {}
  },
  {
    key: 'ax200',
    name: 'Intel AX200 and Killer AX1650 (x/w) final package',
    endOfLife: true,
    urls: [
      'https://www.intel.com/content/www/us/en/download/874349/intel-wireless-bluetooth-driver-for-intel-wi-fi-6-ax200.html',
      'https://www.intel.co.jp/content/www/jp/ja/download/874349/intel-wireless-bluetooth-driver-for-intel-wi-fi-6-ax200.html'
    ],
    models: ['AX200', 'AX1650'],
    fallbackDriverVersions: { AX200: ['24.10.0.4'], AX1650: ['24.10.0.4'] }
  },
  {
    key: 'ac7265',
    name: 'Intel Wireless-AC 3168 and 3165 final package',
    endOfLife: true,
    urls: [
      'https://www.intel.com/content/www/us/en/download/823075/intel-wireless-bluetooth-drivers-for-wireless-ac-7265-rev-d-3168-and-3165.html',
      'https://www.intel.co.jp/content/www/jp/ja/download/823075/intel-wireless-bluetooth-drivers-for-wireless-ac-7265-rev-d-3168-and-3165.html'
    ],
    models: ['3168', '3165'],
    fallbackDriverVersions: { '3168': ['20.100.10.11'], '3165': ['20.100.10.11'] }
  },
  {
    key: 'ac8265',
    name: 'Intel Wireless-AC 8260 and 8265 final package',
    endOfLife: true,
    urls: [
      'https://www.intel.com/content/www/us/en/download/774186/intel-wireless-bluetooth-drivers-for-intel-dual-band-wireless-ac-8260-and-intel-dual-band-wireless-ac-8265.html',
      'https://www.intel.co.jp/content/www/jp/ja/download/774186/intel-wireless-bluetooth-drivers-for-intel-dual-band-wireless-ac-8260-and-intel-dual-band-wireless-ac-8265.html'
    ],
    models: ['8260', '8265'],
    fallbackDriverVersions: { '8260': ['22.200.0.2'], '8265': ['22.200.0.2'] }
  }
];
