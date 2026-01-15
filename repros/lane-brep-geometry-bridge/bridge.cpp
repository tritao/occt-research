#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepMesh_IncrementalMesh.hxx>
#include <BRep_Tool.hxx>
#include <Geom2d_Curve.hxx>
#include <Geom_Curve.hxx>
#include <Geom_Surface.hxx>
#include <Poly_PolygonOnTriangulation.hxx>
#include <Poly_Triangulation.hxx>
#include <Standard_Version.hxx>
#include <TopLoc_Location.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Wire.hxx>

#include <cmath>
#include <iomanip>
#include <iostream>
#include <string>

namespace
{
std::string jsonEscape(const std::string& s)
{
  std::string out;
  out.reserve(s.size() + 8);
  for (char ch : s)
  {
    switch (ch)
    {
      case '\\': out += "\\\\"; break;
      case '"': out += "\\\""; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default: out += ch; break;
    }
  }
  return out;
}

const char* typeName(const Handle(Standard_Transient)& obj)
{
  return obj.IsNull() ? "NULL" : obj->DynamicType()->Name();
}

void writePnt(std::ostream& os, const gp_Pnt& p)
{
  os << "{\"x\":" << p.X() << ",\"y\":" << p.Y() << ",\"z\":" << p.Z() << "}";
}

void writePnt2d(std::ostream& os, const gp_Pnt2d& p)
{
  os << "{\"u\":" << p.X() << ",\"v\":" << p.Y() << "}";
}

void writeTrsf(std::ostream& os, const gp_Trsf& tr)
{
  os << "{\"t\":";
  writePnt(os, gp_Pnt(tr.TranslationPart().X(), tr.TranslationPart().Y(), tr.TranslationPart().Z()));
  os << ",\"m\":[";
  for (int r = 1; r <= 3; ++r)
  {
    if (r != 1)
      os << ",";
    os << "[";
    for (int c = 1; c <= 3; ++c)
    {
      if (c != 1)
        os << ",";
      os << tr.Value(r, c);
    }
    os << "]";
  }
  os << "]}";
}

double dist(const gp_Pnt& a, const gp_Pnt& b)
{
  const double dx = a.X() - b.X();
  const double dy = a.Y() - b.Y();
  const double dz = a.Z() - b.Z();
  return std::sqrt(dx * dx + dy * dy + dz * dz);
}
} // namespace

int main()
{
  std::cout.setf(std::ios::fixed);
  std::cout << std::setprecision(17);

  const gp_Pnt p1(0.0, 0.0, 0.0);
  const gp_Pnt p2(10.0, 0.0, 0.0);
  const gp_Pnt p3(10.0, 5.0, 0.0);
  const gp_Pnt p4(0.0, 5.0, 0.0);

  const TopoDS_Edge e1 = BRepBuilderAPI_MakeEdge(p1, p2);
  const TopoDS_Edge e2 = BRepBuilderAPI_MakeEdge(p2, p3);
  const TopoDS_Edge e3 = BRepBuilderAPI_MakeEdge(p3, p4);
  const TopoDS_Edge e4 = BRepBuilderAPI_MakeEdge(p4, p1);
  const TopoDS_Wire w1 = BRepBuilderAPI_MakeWire(e1, e2, e3, e4);
  const TopoDS_Face face = BRepBuilderAPI_MakeFace(w1);

  TopLoc_Location loc3d;
  Standard_Real first3d = 0.0;
  Standard_Real last3d = 0.0;
  const Handle(Geom_Curve) c3d = BRep_Tool::Curve(e1, loc3d, first3d, last3d);
  const Standard_Real mid3d = 0.5 * (first3d + last3d);
  const gp_Pnt pMid3d = c3d.IsNull() ? gp_Pnt() : c3d->Value(mid3d).Transformed(loc3d.Transformation());

  Standard_Real first2d = 0.0;
  Standard_Real last2d = 0.0;
  const Handle(Geom2d_Curve) c2d = BRep_Tool::CurveOnSurface(e1, face, first2d, last2d);
  const Handle(Geom_Surface) surf = BRep_Tool::Surface(face);
  const Standard_Real mid2d = 0.5 * (first2d + last2d);
  const gp_Pnt2d uvMid = c2d.IsNull() ? gp_Pnt2d() : c2d->Value(mid2d);
  const gp_Pnt pSurfMid = surf.IsNull() ? gp_Pnt() : surf->Value(uvMid.X(), uvMid.Y());

  const Standard_Real tolEdge = BRep_Tool::Tolerance(e1);
  const Standard_Real tolFace = BRep_Tool::Tolerance(face);
  const Standard_Boolean sameParam = BRep_Tool::SameParameter(e1);
  const Standard_Boolean sameRange = BRep_Tool::SameRange(e1);

  // Location effect scenario: translate the face and query again
  gp_Trsf trMove;
  trMove.SetTranslation(gp_Vec(100.0, 0.0, 0.0));
  const TopLoc_Location locMove(trMove);
  const TopoDS_Face faceMoved = TopoDS::Face(face.Moved(locMove));

  TopLoc_Location locSurfMoved;
  const Handle(Geom_Surface) surfMoved = BRep_Tool::Surface(faceMoved, locSurfMoved);

  // Meshing + triangulation availability
  IMeshTools_Parameters params;
  params.Deflection = 1000.0;
  params.Angle = 0.5;
  params.InParallel = Standard_False;
  BRepMesh_IncrementalMesh mesher(face, params);
  mesher.Perform();

  TopLoc_Location locTri;
  const Handle(Poly_Triangulation) tri = BRep_Tool::Triangulation(face, locTri);

  Handle(Poly_PolygonOnTriangulation) polyOnTri;
  Handle(Poly_Triangulation) triFromEdge;
  TopLoc_Location locPoly;
  BRep_Tool::PolygonOnTriangulation(e1, polyOnTri, triFromEdge, locPoly);

  std::cout << "{";
  std::cout << "\"occt_version\":\"" << jsonEscape(OCC_VERSION_STRING_EXT) << "\",";

  std::cout << "\"edge\":{";
  std::cout << "\"tolerance\":" << tolEdge << ",";
  std::cout << "\"same_parameter\":" << (sameParam ? "true" : "false") << ",";
  std::cout << "\"same_range\":" << (sameRange ? "true" : "false") << ",";
  std::cout << "\"curve3d\":{";
  std::cout << "\"type\":\"" << jsonEscape(typeName(c3d)) << "\",";
  std::cout << "\"first\":" << first3d << ",";
  std::cout << "\"last\":" << last3d << ",";
  std::cout << "\"location\":";
  writeTrsf(std::cout, loc3d.Transformation());
  std::cout << ",";
  std::cout << "\"mid_point_world\":";
  writePnt(std::cout, pMid3d);
  std::cout << "},";
  std::cout << "\"pcurve\":{";
  std::cout << "\"type\":\"" << jsonEscape(typeName(c2d)) << "\",";
  std::cout << "\"first\":" << first2d << ",";
  std::cout << "\"last\":" << last2d << ",";
  std::cout << "\"mid_uv\":";
  writePnt2d(std::cout, uvMid);
  std::cout << "}";
  std::cout << "},";

  std::cout << "\"face\":{";
  std::cout << "\"tolerance\":" << tolFace << ",";
  std::cout << "\"surface_type\":\"" << jsonEscape(typeName(surf)) << "\",";
  std::cout << "\"surface_mid_from_pcurve\":";
  writePnt(std::cout, pSurfMid);
  std::cout << ",";
  std::cout << "\"curve_surface_mid_distance\":" << dist(pMid3d, pSurfMid);
  std::cout << "},";

  std::cout << "\"location_effect\":{";
  std::cout << "\"move\":";
  writeTrsf(std::cout, trMove);
  std::cout << ",";
  std::cout << "\"surface_type\":\"" << jsonEscape(typeName(surfMoved)) << "\",";
  std::cout << "\"surface_location\":";
  writeTrsf(std::cout, locSurfMoved.Transformation());
  std::cout << "},";

  std::cout << "\"triangulation\":{";
  std::cout << "\"has_face_triangulation\":" << (!tri.IsNull() ? "true" : "false") << ",";
  std::cout << "\"nb_nodes\":" << (tri.IsNull() ? 0 : tri->NbNodes()) << ",";
  std::cout << "\"nb_triangles\":" << (tri.IsNull() ? 0 : tri->NbTriangles()) << ",";
  std::cout << "\"has_edge_polygon_on_triangulation\":" << (!polyOnTri.IsNull() ? "true" : "false") << ",";
  std::cout << "\"edge_polygon_nb_nodes\":" << (polyOnTri.IsNull() ? 0 : polyOnTri->NbNodes());
  std::cout << "}";

  std::cout << "}\n";
  return 0;
}
