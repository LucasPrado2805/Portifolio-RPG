UPDATE posicoes SET bioma_id = 1;

UPDATE posicoes SET bioma_id = 4 WHERE (x, y) IN ((7,1),(6,2),(5,3),(4,4),(3,4),(2,5),(7,2),(6,3),(5,4),(4,5),(7,3),(6,4),(5,5),(6,5),(7,5),(7,4),(3,5),(2,4),(2,3),(1,4),(1,5));

UPDATE posicoes SET bioma_id = 3 WHERE (y = -5 AND x BETWEEN -7 AND 3) OR (y = -4 AND x BETWEEN -7 AND 1) OR (y = -3 AND x BETWEEN -7 AND 0) OR (y = -2 AND x BETWEEN -6 AND 0) OR (y = -1 AND x BETWEEN -5 AND -3);

UPDATE posicoes SET bioma_id = 2 WHERE (x = -7 AND y BETWEEN -2 AND 4) OR (x = -6 AND y BETWEEN -1 AND 4) OR (x = -5 AND y BETWEEN 0 AND 4) OR (x = -4 AND y BETWEEN 0 AND 3) OR (x = -3 AND y BETWEEN 0 AND 2) OR (x, y) IN ((-2,-1),(-1,-1));
