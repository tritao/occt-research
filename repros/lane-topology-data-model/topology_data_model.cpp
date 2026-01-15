#include <BRep_Builder.hxx>
#include <BRepPrimAPI_MakeBox.hxx>
#include <BRep_Tool.hxx>
#include <Standard_VersionInfo.hxx>
#include <TopExp.hxx>
#include <TopExp_Explorer.hxx>
#include <TopLoc_Location.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Compound.hxx>
#include <TopoDS_Shape.hxx>
#include <TopoDS_Vertex.hxx>
#include <gp_Pnt.hxx>
#include <gp_Trsf.hxx>
#include <gp_Vec.hxx>

#include <algorithm>
#include <array>
#include <iomanip>
#include <iostream>
#include <locale>
#include <sstream>
#include <string>
#include <vector>

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

void PrintReal(std::ostream& out, const Standard_Real value) { out << std::setprecision(17) << value; }

std::string OrientationToString(const TopAbs_Orientation o)
{
  switch (o)
  {
    case TopAbs_FORWARD:
      return "FORWARD";
    case TopAbs_REVERSED:
      return "REVERSED";
    case TopAbs_INTERNAL:
      return "INTERNAL";
    case TopAbs_EXTERNAL:
      return "EXTERNAL";
  }
  return "UNKNOWN";
}

std::array<Standard_Real, 3> TranslationPart(const TopLoc_Location& loc)
{
  const gp_Trsf trsf = loc.Transformation();
  const gp_XYZ t = trsf.TranslationPart();
  return {t.X(), t.Y(), t.Z()};
}

std::vector<std::array<Standard_Real, 3>> CollectVertexPointsSorted(const TopoDS_Shape& shape)
{
  TopTools_IndexedMapOfShape vertices;
  TopExp::MapShapes(shape, TopAbs_VERTEX, vertices);

  std::vector<std::array<Standard_Real, 3>> points;
  points.reserve(static_cast<size_t>(vertices.Size()));

  for (Standard_Integer i = 1; i <= vertices.Size(); ++i)
  {
    const TopoDS_Vertex v = TopoDS::Vertex(vertices(i));
    const gp_Pnt p = BRep_Tool::Pnt(v);
    points.push_back({p.X(), p.Y(), p.Z()});
  }

  std::sort(points.begin(), points.end(), [](const auto& a, const auto& b) {
    if (a[0] != b[0])
      return a[0] < b[0];
    if (a[1] != b[1])
      return a[1] < b[1];
    return a[2] < b[2];
  });
  return points;
}

void PrintPointArray(std::ostream& out, const std::array<Standard_Real, 3>& p)
{
  out << '[';
  PrintReal(out, p[0]);
  out << ", ";
  PrintReal(out, p[1]);
  out << ", ";
  PrintReal(out, p[2]);
  out << ']';
}

void PrintPointArrayList(std::ostream& out,
                         const std::vector<std::array<Standard_Real, 3>>& points,
                         const size_t maxItems)
{
  out << '[';
  const size_t n = std::min(points.size(), maxItems);
  for (size_t i = 0; i < n; ++i)
  {
    if (i != 0)
      out << ", ";
    PrintPointArray(out, points[i]);
  }
  out << ']';
}
} // namespace

int main()
{
  std::cout.imbue(std::locale::classic());

  const char* versionStr = OCCT_Version_String_Extended();
  const char* devStr = OCCT_DevelopmentVersion();

  // Base topology payload (TShape), used for multiple instances.
  const TopoDS_Shape base = BRepPrimAPI_MakeBox(1.0, 2.0, 3.0).Shape();

  gp_Trsf tr;
  tr.SetTranslation(gp_Vec(10.0, 0.0, 0.0));
  const TopLoc_Location locB(tr);

  const TopoDS_Shape instA = base;              // same TShape, identity location
  const TopoDS_Shape instB = base.Moved(locB);  // same TShape, translated location

  TopoDS_Shape instARev = instA;
  instARev.Reverse(); // orientation-only change

  const bool a_partner_b = instA.IsPartner(instB);
  const bool a_same_b = instA.IsSame(instB);
  const bool a_equal_b = instA.IsEqual(instB);

  const bool a_partner_arev = instA.IsPartner(instARev);
  const bool a_same_arev = instA.IsSame(instARev);
  const bool a_equal_arev = instA.IsEqual(instARev);

  TopTools_IndexedMapOfShape map;
  map.Add(instA);
  const Standard_Integer mapAfterA = map.Size();
  map.Add(instARev); // should not increase size (orientation ignored)
  const Standard_Integer mapAfterARev = map.Size();
  map.Add(instB); // should increase size (location differs)
  const Standard_Integer mapAfterB = map.Size();

  // Build a compound containing two instances and traverse vertices to show location propagation.
  BRep_Builder builder;
  TopoDS_Compound compound;
  builder.MakeCompound(compound);
  builder.Add(compound, instA);
  builder.Add(compound, instB);

  TopTools_IndexedMapOfShape compoundVertices;
  TopExp::MapShapes(compound, TopAbs_VERTEX, compoundVertices);

  const std::vector<std::array<Standard_Real, 3>> pointsA = CollectVertexPointsSorted(instA);
  const std::vector<std::array<Standard_Real, 3>> pointsB = CollectVertexPointsSorted(instB);

  // Representative per-instance vertex to show identity tiers at sub-shape level.
  TopTools_IndexedMapOfShape verticesA;
  TopTools_IndexedMapOfShape verticesB;
  TopExp::MapShapes(instA, TopAbs_VERTEX, verticesA);
  TopExp::MapShapes(instB, TopAbs_VERTEX, verticesB);
  const TopoDS_Vertex vA = verticesA.Size() >= 1 ? TopoDS::Vertex(verticesA(1)) : TopoDS_Vertex();
  const TopoDS_Vertex vB = verticesB.Size() >= 1 ? TopoDS::Vertex(verticesB(1)) : TopoDS_Vertex();

  bool v_partner = false;
  bool v_same = false;
  bool v_equal = false;
  if (!vA.IsNull() && !vB.IsNull())
  {
    v_partner = vA.IsPartner(vB);
    v_same = vA.IsSame(vB);
    v_equal = vA.IsEqual(vB);
  }

  const auto bTranslation = TranslationPart(instB.Location());

  std::cout << "{\n";
  std::cout << "  \"meta\": {\n";
  std::cout << "    \"occt_version\": " << JsonEscape(versionStr == nullptr ? "" : versionStr) << ",\n";
  std::cout << "    \"occt_dev\": " << JsonEscape(devStr == nullptr ? "" : devStr) << "\n";
  std::cout << "  },\n";

  std::cout << "  \"identity\": {\n";
  std::cout << "    \"instA_orientation\": " << JsonEscape(OrientationToString(instA.Orientation())) << ",\n";
  std::cout << "    \"instARev_orientation\": " << JsonEscape(OrientationToString(instARev.Orientation())) << ",\n";
  std::cout << "    \"instA_vs_instB\": {\n";
  std::cout << "      \"is_partner\": " << (a_partner_b ? "true" : "false") << ",\n";
  std::cout << "      \"is_same\": " << (a_same_b ? "true" : "false") << ",\n";
  std::cout << "      \"is_equal\": " << (a_equal_b ? "true" : "false") << "\n";
  std::cout << "    },\n";
  std::cout << "    \"instA_vs_instARev\": {\n";
  std::cout << "      \"is_partner\": " << (a_partner_arev ? "true" : "false") << ",\n";
  std::cout << "      \"is_same\": " << (a_same_arev ? "true" : "false") << ",\n";
  std::cout << "      \"is_equal\": " << (a_equal_arev ? "true" : "false") << "\n";
  std::cout << "    },\n";
  std::cout << "    \"vertex_subshape_instA_vs_instB\": {\n";
  std::cout << "      \"is_partner\": " << (v_partner ? "true" : "false") << ",\n";
  std::cout << "      \"is_same\": " << (v_same ? "true" : "false") << ",\n";
  std::cout << "      \"is_equal\": " << (v_equal ? "true" : "false") << "\n";
  std::cout << "    }\n";
  std::cout << "  },\n";

  std::cout << "  \"location\": {\n";
  std::cout << "    \"instB_translation\": ";
  PrintPointArray(std::cout, bTranslation);
  std::cout << "\n";
  std::cout << "  },\n";

  std::cout << "  \"maps\": {\n";
  std::cout << "    \"indexed_map_of_shape_sizes\": {\n";
  std::cout << "      \"after_instA\": " << mapAfterA << ",\n";
  std::cout << "      \"after_instARev\": " << mapAfterARev << ",\n";
  std::cout << "      \"after_instB\": " << mapAfterB << "\n";
  std::cout << "    }\n";
  std::cout << "  },\n";

  std::cout << "  \"traversal\": {\n";
  std::cout << "    \"instA_vertex_count\": " << static_cast<int>(pointsA.size()) << ",\n";
  std::cout << "    \"instB_vertex_count\": " << static_cast<int>(pointsB.size()) << ",\n";
  std::cout << "    \"compound_unique_vertex_count\": " << compoundVertices.Size() << ",\n";
  std::cout << "    \"instA_vertices_sorted_first4\": ";
  PrintPointArrayList(std::cout, pointsA, 4);
  std::cout << ",\n";
  std::cout << "    \"instB_vertices_sorted_first4\": ";
  PrintPointArrayList(std::cout, pointsB, 4);
  std::cout << "\n";
  std::cout << "  }\n";
  std::cout << "}\n";

  return 0;
}
