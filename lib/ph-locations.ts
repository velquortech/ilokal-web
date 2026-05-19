import phDataRaw from '@/data/philippine_provinces_cities_municipalities_and_barangays_2019v2.json';

// --- Types ---

export interface PhilippineData {
  [regionCode: string]: Region;
}

export interface Region {
  region_name: string;
  province_list: {
    [provinceName: string]: ProvinceData;
  };
}

export interface ProvinceData {
  municipality_list: {
    [municipalityName: string]: MunicipalityData;
  };
}

export interface MunicipalityData {
  barangay_list: string[];
}

export type Province = string;
export type City = string;
export type Barangay = string;

// --- Implementation ---

const phData = phDataRaw as unknown as PhilippineData;

const provinceCitiesMap: Record<string, string[]> = {};
const cityBarangaysMap: Record<string, string[]> = {};

Object.values(phData).forEach((region: Region) => {
  const provinces = region.province_list;

  Object.keys(provinces).forEach((provinceName) => {
    const provinceData = provinces[provinceName];
    const cities: string[] = [];

    if (provinceData.municipality_list) {
      Object.keys(provinceData.municipality_list).forEach(
        (municipalityName) => {
          const munData = provinceData.municipality_list[municipalityName];
          cities.push(municipalityName);

          if (munData.barangay_list) {
            const cityKey = `${municipalityName}, ${provinceName}`;
            cityBarangaysMap[cityKey] = munData.barangay_list;
          }
        },
      );
    }

    // Accumulate cities if the province already exists across regions (rare but safe)
    provinceCitiesMap[provinceName] = [
      ...(provinceCitiesMap[provinceName] || []),
      ...cities,
    ];
  });
});

export function getProvinces(): Province[] {
  return Object.keys(provinceCitiesMap).sort();
}

export function getCitiesByProvince(province: Province): City[] {
  return provinceCitiesMap[province] || [];
}

export function getBarangaysByCity(city: City, province: Province): Barangay[] {
  const cityKey = `${city}, ${province}`;
  return cityBarangaysMap[cityKey] || [];
}
