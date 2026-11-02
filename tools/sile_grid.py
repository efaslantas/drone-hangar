"""Preserve an established rounded lattice while adding adjacent native cells."""
def preserve_grid(old,cols,rows,bounds,heights,side='west'):
 if side not in ('west','east'):raise ValueError('Unsupported extension side')
 step=(old['bounds'][1]-old['bounds'][0])/(old['cols']-1);extra=cols-old['cols'];left=extra if side=='west' else 0
 expected=list(old['bounds']);expected[0]-=left*step;expected[1]+=(extra-left)*step
 if rows!=old['rows']or extra<0 or len(heights)!=cols*rows or any(abs(a-b)>.02 for a,b in zip(bounds,expected)):raise ValueError('Extension must align to established lattice')
 result=list(heights);delta=0
 for r in range(rows):
  for c in range(old['cols']):
   i=r*cols+left+c;v=old['heights'][r*old['cols']+c];delta=max(delta,abs(result[i]-v));result[i]=v
 # Only compensate centimetre quantization/alignment; never hide a new DEM.
 if delta>.02:raise ValueError('Established native grid samples changed')
 return {'bounds':expected,'heights':result,'extra':extra,'maxResamplingDifferenceM':delta}
