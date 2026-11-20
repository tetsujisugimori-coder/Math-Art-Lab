import importlib.util,pathlib,tempfile,unittest,zipfile,stat
spec=importlib.util.spec_from_file_location('subject',pathlib.Path(__file__).with_name('three-body-stage-ab-zip.py'));s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
class ZipSafety(unittest.TestCase):
 def fixture(self,names):
  root=pathlib.Path(tempfile.mkdtemp(prefix='ab-zip-'));z=root/'in.zip'
  with zipfile.ZipFile(z,'x') as f:
   for n in names:f.writestr(n,b'fixed')
  # Windows zipfile normalizes separators when writing: create an actual hostile
  # central/local header name, rather than testing an already-normalized fixture.
  if len(names)==1 and isinstance(names[0],str) and '\\' in names[0]:
   before=names[0].replace('\\','/').encode();after=names[0].encode();b=z.read_bytes()
   self.assertEqual(b.count(before),2);z.write_bytes(b.replace(before,after))
   with zipfile.ZipFile(z) as f:self.assertEqual([i.orig_filename for i in f.infolist()],names)
  return root,z
 def test_rejections(self):
  for names in [['/absolute'],['../escape'],['C:drive'],['a\\b'],['a','a'],['A','a'],['a.'],['a '],['CON.txt'],['x:stream'],['a','a/b'],['a?'],['a*'],['a|'],['a<'],['a>'],['a"']]:
   with self.subTest(names=names):
    root,z=self.fixture(names)
    with self.assertRaises(ValueError):s.extract(z,root/'out',root)
    self.assertFalse((root/'out').exists())
 def test_link(self):
  i=zipfile.ZipInfo('link');i.create_system=3;i.external_attr=(stat.S_IFLNK|0o777)<<16
  root,z=self.fixture([i])
  with self.assertRaises(ValueError):s.extract(z,root/'out',root)
 def test_escape_and_collision(self):
  root,z=self.fixture(['ok'])
  with self.assertRaises(ValueError):s.extract(z,root.parent/'escaped',root)
  (root/'out').mkdir()
  with self.assertRaises(ValueError):s.extract(z,root/'out',root)
 def test_normal_and_corrupt(self):
  root,z=self.fixture(['a/.last-run.json','a/b.txt']);self.assertEqual(s.extract(z,root/'out',root)['files'],2)
  (root/'out/a/b.txt').write_bytes(b'changed')
  with self.assertRaises(ValueError):s.verify(z,root/'out')
 def test_extra_and_missing(self):
  for mode in ['extra','missing']:
   root,z=self.fixture(['one']);s.extract(z,root/'out',root)
   if mode=='extra':(root/'out/two').write_bytes(b'x')
   else:(root/'out/one').rename(root/'out/renamed')
   with self.assertRaises(ValueError):s.verify(z,root/'out')
if __name__=='__main__':unittest.main()
