const {spawnSync}=require('node:child_process');
const root=require('node:path').resolve(__dirname,'..');
const q=`BEGIN;
SELECT pg_advisory_xact_lock(905005);
DO $$ DECLARE zona_id integer; BEGIN
 SELECT id_zona_entrega INTO zona_id FROM zona_entrega WHERE departamento='Guatemala' AND municipio='Guatemala' AND zonas=ARRAY['5'] AND activa=true ORDER BY id_zona_entrega LIMIT 1;
 IF zona_id IS NULL THEN INSERT INTO zona_entrega(nombre,departamento,municipio,zonas,activa,updated_at) VALUES('Guatemala zona 5 - ejemplo autorizado','Guatemala','Guatemala',ARRAY['5'],true,now()) RETURNING id_zona_entrega INTO zona_id; END IF;
 IF NOT EXISTS(SELECT 1 FROM tarifa_entrega WHERE id_zona=zona_id AND id_sucursal=1 AND importe=20 AND minimo_compra=50 AND umbral_gratis=200 AND desde<=now() AND (hasta IS NULL OR hasta>now())) THEN
  UPDATE tarifa_entrega SET hasta=now(),updated_at=now() WHERE id_zona=zona_id AND id_sucursal=1 AND hasta IS NULL;
  INSERT INTO tarifa_entrega(id_sucursal,importe,minimo_compra,umbral_gratis,desde,id_zona,updated_at) VALUES(1,20,50,200,now(),zona_id,now());
 END IF;
 END $$;
COMMIT;`;
(async()=>{const r=await fetch('http://localhost:3003/sucursales');const sucursales=await r.json();const s=sucursales.find(s=>s.id_sucursal===1&&s.departamento==='Guatemala'&&s.municipio==='Guatemala');if(!s)throw Error('La sucursal esperada no coincide.');const out=spawnSync('docker',['compose','exec','-T','postgres','sh','-c','psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d gaby_pedidos'],{cwd:root,input:q,encoding:'utf8'});if(out.status)throw Error(out.stderr);console.log('Configurados los ejemplos autorizados para Farmacia Gaby: zona 5, envío Q20, mínimo Q50, gratis desde Q200.');})().catch(e=>{console.error(e.message);process.exitCode=1;});
