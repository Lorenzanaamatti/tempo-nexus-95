
update public.partners
set tipo = 'Plataforma'
where lower(nombre) similar to '%(amazon prime|prime video|disney|hbo|max|atresmedia|apple tv|filmin|movistar|netflix|skyshowtime|rtve play|mubi|sundance)%'
  and tipo <> 'Plataforma'
  and lower(nombre) not similar to '%(cine|studios|producciones)%';
