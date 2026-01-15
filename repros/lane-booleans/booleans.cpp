#include <BOPAlgo_Options.hxx>
#include <BRepAlgoAPI_Common.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepBndLib.hxx>
#include <BRepCheck_Analyzer.hxx>
#include <BRepPrimAPI_MakeBox.hxx>
#include <Standard_VersionInfo.hxx>
#include <TopExp.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopoDS_Shape.hxx>
#include <gp_Pnt.hxx>
#include <gp_Trsf.hxx>
#include <gp_Vec.hxx>

#include <iomanip>
#include <iostream>
#include <locale>
#include <sstream>
#include <string>

namespace
{
std::string JsonEscape(const std::string& input)
{
  std::ostringstream out;
  out << '"';
  for (const unsigned char c : input)
  {
    switch (c)
    {
      case '\\':
        out << "\\\\";
        break;
      case '"':
        out << "\\\"";
        break;
      case '\b':
        out << "\\b";
        break;
      case '\f':
        out << "\\f";
        break;
      case '\n':
        out << "\\n";
        break;
      case '\r':
        out << "\\r";
        break;
      case '\t':
        out << "\\t";
        break;
      default:
        if (c < 0x20)
        {
          out << "\\u" << std::hex << std::setw(4) << std::setfill('0')
              << static_cast<int>(c) << std::dec << std::setw(0);
        }
        else
        {
          out << static_cast<char>(c);
        }
        break;
    }
  }
  out << '"';
  return out.str();
}

struct ShapeCounts
{
  Standard_Integer solids = 0;
  Standard_Integer faces = 0;
  Standard_Integer edges = 0;
  Standard_Integer vertices = 0;
};

ShapeCounts Count(const TopoDS_Shape& shape)
{
  ShapeCounts counts;
  TopTools_IndexedMapOfShape map;
  TopExp::MapShapes(shape, TopAbs_SOLID, map);
  counts.solids = map.Size();
  map.Clear();
  TopExp::MapShapes(shape, TopAbs_FACE, map);
  counts.faces = map.Size();
  map.Clear();
  TopExp::MapShapes(shape, TopAbs_EDGE, map);
  counts.edges = map.Size();
  map.Clear();
  TopExp::MapShapes(shape, TopAbs_VERTEX, map);
  counts.vertices = map.Size();
  return counts;
}

void PrintBBox(std::ostream& out, const TopoDS_Shape& shape)
{
  Bnd_Box box;
  BRepBndLib::Add(shape, box);
  if (box.IsVoid())
  {
    out << "{ \"is_void\": true }";
    return;
  }

  Standard_Real xmin = 0, ymin = 0, zmin = 0, xmax = 0, ymax = 0, zmax = 0;
  box.Get(xmin, ymin, zmin, xmax, ymax, zmax);

  out << "{ \"is_void\": false, \"min\": [";
  out << std::setprecision(17) << xmin << ", " << ymin << ", " << zmin;
  out << "], \"max\": [";
  out << std::setprecision(17) << xmax << ", " << ymax << ", " << zmax;
  out << "] }";
}

template <typename TAlgo>
void PrintOp(std::ostream& out, const char* name, TAlgo& algo)
{
  algo.SetRunParallel(Standard_False);
  algo.Build();

  const TopoDS_Shape res = algo.Shape();
  const ShapeCounts counts = Count(res);
  const BRepCheck_Analyzer analyzer(res);

  out << "    " << JsonEscape(name) << ": {\n";
  out << "      \"has_errors\": " << (algo.HasErrors() ? "true" : "false") << ",\n";
  out << "      \"has_warnings\": " << (algo.HasWarnings() ? "true" : "false") << ",\n";
  out << "      \"is_valid\": " << (analyzer.IsValid() ? "true" : "false") << ",\n";
  out << "      \"counts\": { \"solids\": " << counts.solids << ", \"faces\": " << counts.faces
      << ", \"edges\": " << counts.edges << ", \"vertices\": " << counts.vertices << " },\n";
  out << "      \"bbox\": ";
  PrintBBox(out, res);
  out << "\n";
  out << "    }";
}
} // namespace

int main()
{
  std::cout.imbue(std::locale::classic());

  const char* versionStr = OCCT_Version_String_Extended();
  const char* devStr = OCCT_DevelopmentVersion();

  // Force deterministic mode.
  BOPAlgo_Options::SetParallelMode(Standard_False);

  const TopoDS_Shape boxA = BRepPrimAPI_MakeBox(gp_Pnt(0.0, 0.0, 0.0), gp_Pnt(10.0, 10.0, 10.0)).Shape();

  gp_Trsf tr;
  tr.SetTranslation(gp_Vec(5.0, 0.0, 0.0));
  const TopoDS_Shape boxB = BRepPrimAPI_MakeBox(gp_Pnt(0.0, 0.0, 0.0), gp_Pnt(10.0, 10.0, 10.0))
                              .Shape()
                              .Moved(TopLoc_Location(tr));

  std::cout << "{\n";
  std::cout << "  \"meta\": {\n";
  std::cout << "    \"occt_version\": " << JsonEscape(versionStr == nullptr ? "" : versionStr) << ",\n";
  std::cout << "    \"occt_dev\": " << JsonEscape(devStr == nullptr ? "" : devStr) << ",\n";
  std::cout << "    \"parallel_mode\": " << (BOPAlgo_Options::GetParallelMode() ? "true" : "false")
            << "\n";
  std::cout << "  },\n";

  std::cout << "  \"inputs\": {\n";
  std::cout << "    \"boxA\": { \"bbox\": ";
  PrintBBox(std::cout, boxA);
  std::cout << " },\n";
  std::cout << "    \"boxB\": { \"bbox\": ";
  PrintBBox(std::cout, boxB);
  std::cout << " }\n";
  std::cout << "  },\n";

  std::cout << "  \"ops\": {\n";
  BRepAlgoAPI_Fuse fuse(boxA, boxB);
  PrintOp(std::cout, "fuse", fuse);
  std::cout << ",\n";
  BRepAlgoAPI_Common common(boxA, boxB);
  PrintOp(std::cout, "common", common);
  std::cout << ",\n";
  BRepAlgoAPI_Cut cut(boxA, boxB);
  PrintOp(std::cout, "cut", cut);
  std::cout << "\n";
  std::cout << "  }\n";
  std::cout << "}\n";

  return 0;
}

