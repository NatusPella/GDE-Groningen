// the GTE_* names from before 0.29 still work: copy them to GDE_*
for (const [k, v] of Object.entries(process.env)) if (k.startsWith('GTE_') && process.env['GDE_' + k.slice(4)] === undefined) process.env['GDE_' + k.slice(4)] = v;
