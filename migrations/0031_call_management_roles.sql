UPDATE platform_settings
SET value_json = json_set(
  value_json,
  '$.sectors',
  json_array(
    'Property Service Coordinator (PSC)',
    'Back Office',
    'Contrôleur de gestion',
    'Responsable de site',
    'Coordinateur de services',
    'Agent de sécurité',
    'Agent de propreté',
    'Technicien de maintenance',
    'Assistant administratif',
    'Autre'
  )
)
WHERE section = 'jobs'
  AND json_extract(value_json, '$.sectors[0]') = 'Informatique';
