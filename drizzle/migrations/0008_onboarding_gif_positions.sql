WITH b(p, n, x, y, w, h, z) AS (VALUES (10,'image8.',0.4634,0.228,0.5,0.5,0),(11,'image9.',0.7599,0.3161,0.2069,0.3678,0),(11,'image10.',0.0,0.6296,0.2552,0.3704,1),(11,'image11.',0.01,0.0592,0.3625,0.2739,2),(11,'image12.',0.3725,0.0122,0.3874,0.3678,3),(11,'image13.',0.684,0.6852,0.316,0.3148,4),(11,'image14.',0.01,0.3856,0.2247,0.2197,5),(11,'image15.',0.4357,0.4083,0.2997,0.2941,6),(11,'image16.',0.2348,0.2351,0.1764,0.4501,7),(11,'image17.',0.5076,0.7046,0.1764,0.2944,8),(11,'image18.',0.2552,0.6852,0.2884,0.3148,9),(11,'image19.',0.7599,0.0,0.2401,0.3415,10),(17,'image20.',0.5845,0.3131,0.3562,0.3553,0),(23,'image20.',0.5845,0.3131,0.3562,0.3553,0),(32,'image21.',0.5637,0.2697,0.3646,0.4167,0),(34,'image22.',0.6332,0.6709,0.2269,0.2567,0))
UPDATE public.onboarding_slides s SET media = (
  SELECT jsonb_agg(CASE WHEN bb.n IS NULL THEN e ELSE e || jsonb_build_object('box', jsonb_build_object('x',bb.x,'y',bb.y,'w',bb.w,'h',bb.h,'z',bb.z)) END ORDER BY o)
  FROM jsonb_array_elements(s.media) WITH ORDINALITY AS t(e, o)
  LEFT JOIN b bb ON bb.p = s.position AND (e->>'url') LIKE '%onboarding-' || bb.n || '%'
)
WHERE s.position IN (SELECT p FROM b);