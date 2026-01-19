#include <BRepBndLib.hxx>
#include <BRepCheck_Analyzer.hxx>
#include <BRepFilletAPI_MakeChamfer.hxx>
#include <BRepFilletAPI_MakeFillet.hxx>
#include <BRepPrimAPI_MakeBox.hxx>
#include <BRep_Tool.hxx>
#include <ChFiDS_ErrorStatus.hxx>
#include <Standard_Failure.hxx>
#include <Standard_VersionInfo.hxx>
#include <TopExp.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopTools_ListOfShape.hxx>
#include <TopTools_ListIteratorOfListOfShape.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Shape.hxx>
#include <TopoDS_Vertex.hxx>
#include <gp_Pnt.hxx>

#include <iomanip>
#include <iostream>
#include <locale>
#include <map>
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
      case '\\': out << "\\\\"; break;
      case '"': out << "\\\""; break;
      case '\b': out << "\\b"; break;
      case '\f': out << "\\f"; break;
      case '\n': out << "\\n"; break;
      case '\r': out << "\\r"; break;
      case '\t': out << "\\t"; break;
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

const char* TypeName(const Handle(Standard_Transient)& obj)
{
  return obj.IsNull() ? "NULL" : obj->DynamicType()->Name();
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
  if (shape.IsNull())
  {
    out << "{ \"is_void\": true }";
    return;
  }

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

std::string StripeStatusName(const ChFiDS_ErrorStatus st)
{
  switch (st)
  {
    case ChFiDS_Ok: return "ChFiDS_Ok";
    case ChFiDS_Error: return "ChFiDS_Error";
    case ChFiDS_WalkingFailure: return "ChFiDS_WalkingFailure";
    case ChFiDS_StartsolFailure: return "ChFiDS_StartsolFailure";
    case ChFiDS_TwistedSurface: return "ChFiDS_TwistedSurface";
  }
  return "Unknown";
}

gp_Pnt VertexPoint(const TopoDS_Vertex& v)
{
  return v.IsNull() ? gp_Pnt() : BRep_Tool::Pnt(v);
}

TopoDS_Vertex FindMinCornerVertex(const TopoDS_Shape& shape)
{
  TopTools_IndexedMapOfShape verts;
  TopExp::MapShapes(shape, TopAbs_VERTEX, verts);

  TopoDS_Vertex best;
  Standard_Real bestScore = 0.0;
  for (Standard_Integer i = 1; i <= verts.Size(); ++i)
  {
    const TopoDS_Vertex v = TopoDS::Vertex(verts(i));
    const gp_Pnt p = VertexPoint(v);
    const Standard_Real score = p.X() + p.Y() + p.Z();
    if (best.IsNull() || score < bestScore)
    {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

std::vector<TopoDS_Edge> EdgesIncidentToVertex(const TopoDS_Shape& shape, const TopoDS_Vertex& v)
{
  std::vector<TopoDS_Edge> edges;
  if (v.IsNull())
    return edges;

  TopTools_IndexedMapOfShape mapEdges;
  TopExp::MapShapes(shape, TopAbs_EDGE, mapEdges);
  for (Standard_Integer i = 1; i <= mapEdges.Size(); ++i)
  {
    const TopoDS_Edge e = TopoDS::Edge(mapEdges(i));
    TopoDS_Vertex v1;
    TopoDS_Vertex v2;
    TopExp::Vertices(e, v1, v2);
    if (!v1.IsNull() && v1.IsSame(v))
      edges.push_back(e);
    else if (!v2.IsNull() && v2.IsSame(v))
      edges.push_back(e);
  }
  return edges;
}

std::map<std::string, int> SurfaceTypeHistogram(const TopoDS_Shape& shape)
{
  std::map<std::string, int> hist;
  TopTools_IndexedMapOfShape faces;
  TopExp::MapShapes(shape, TopAbs_FACE, faces);
  for (Standard_Integer i = 1; i <= faces.Size(); ++i)
  {
    const TopoDS_Face face = TopoDS::Face(faces(i));
    const Handle(Geom_Surface) surf = BRep_Tool::Surface(face);
    const std::string type = TypeName(surf);
    hist[type] += 1;
  }
  return hist;
}

void PrintSurfaceHistogram(std::ostream& out, const std::map<std::string, int>& hist)
{
  out << "{";
  bool first = true;
  for (const auto& [name, count] : hist)
  {
    if (!first)
      out << ", ";
    first = false;
    out << JsonEscape(name) << ": " << count;
  }
  out << "}";
}

Standard_Integer EdgeIndexIn(const std::vector<TopoDS_Edge>& edges, const TopoDS_Edge& e)
{
  for (Standard_Integer i = 0; i < static_cast<Standard_Integer>(edges.size()); ++i)
  {
    if (!e.IsNull() && edges[static_cast<size_t>(i)].IsSame(e))
      return i + 1;
  }
  return 0;
}

Standard_Integer CountGeneratedFacesForEdges(BRepFilletAPI_MakeFillet& mk, const std::vector<TopoDS_Edge>& edges)
{
  Standard_Integer total = 0;
  for (const auto& e : edges)
  {
    const TopTools_ListOfShape& gen = mk.Generated(e);
    for (TopTools_ListIteratorOfListOfShape it(gen); it.More(); it.Next())
    {
      const TopoDS_Shape s = it.Value();
      if (s.ShapeType() == TopAbs_FACE)
        total += 1;
    }
  }
  return total;
}

Standard_Integer CountGeneratedFacesForEdges(BRepFilletAPI_MakeChamfer& mk,
                                             const std::vector<TopoDS_Edge>& edges)
{
  Standard_Integer total = 0;
  for (const auto& e : edges)
  {
    const TopTools_ListOfShape& gen = mk.Generated(e);
    for (TopTools_ListIteratorOfListOfShape it(gen); it.More(); it.Next())
    {
      const TopoDS_Shape s = it.Value();
      if (s.ShapeType() == TopAbs_FACE)
        total += 1;
    }
  }
  return total;
}

std::map<std::string, int> ComputedSurfaceTypeHistogram(BRepFilletAPI_MakeFillet& mk,
                                                        const Standard_Integer    ic)
{
  std::map<std::string, int> hist;
  const Standard_Integer nb = mk.NbComputedSurfaces(ic);
  for (Standard_Integer is = 1; is <= nb; ++is)
  {
    const Handle(Geom_Surface) surf = mk.ComputedSurface(ic, is);
    hist[TypeName(surf)] += 1;
  }
  return hist;
}

void EmitFilletCase(std::ostream& out,
                    const char* name,
                    const TopoDS_Shape& input,
                    const std::vector<TopoDS_Edge>& inputEdges,
                    const std::vector<TopoDS_Edge>& edgesToFillet,
                    const Standard_Real radius,
                    const bool last)
{
  BRepFilletAPI_MakeFillet mk(input);
  for (const auto& e : edgesToFillet)
  {
    mk.Add(radius, e);
  }

  bool didThrow = false;
  std::string exception;
  try
  {
    mk.Build();
  }
  catch (const Standard_Failure& ex)
  {
    didThrow = true;
    exception = ex.GetMessageString() == nullptr ? "" : ex.GetMessageString();
  }

  const Standard_Integer nbContours = mk.NbContours();
  const Standard_Integer nbFaultyContours = mk.NbFaultyContours();
  const Standard_Integer nbFaultyVertices = mk.NbFaultyVertices();
  const Standard_Boolean hasResult = mk.HasResult();
  const Standard_Boolean isDone = mk.IsDone();

  TopoDS_Shape result;
  if (isDone)
  {
    try
    {
      result = mk.Shape();
    }
    catch (const Standard_Failure& ex)
    {
      didThrow = true;
      if (exception.empty())
        exception = ex.GetMessageString() == nullptr ? "" : ex.GetMessageString();
    }
  }

  TopoDS_Shape badShape;
  if (hasResult)
  {
    try
    {
      badShape = mk.BadShape();
    }
    catch (const Standard_Failure&)
    {
    }
  }
  const ShapeCounts counts = Count(result);
  const ShapeCounts badCounts = Count(badShape);
  const Standard_Boolean isValid = result.IsNull() ? Standard_False : BRepCheck_Analyzer(result).IsValid();
  const Standard_Integer generatedFaces = isDone ? CountGeneratedFacesForEdges(mk, edgesToFillet) : 0;
  const Standard_Integer nbSurfaces = isDone ? mk.NbSurfaces() : 0;

  out << "    " << JsonEscape(name) << ": {\n";
  out << "      \"kind\": \"fillet\",\n";
  out << "      \"params\": { \"radius\": " << std::setprecision(17) << radius << " },\n";
  out << "      \"selection\": { \"edges_added\": " << edgesToFillet.size() << " },\n";
  out << "      \"build\": {\n";
  out << "        \"did_throw\": " << (didThrow ? "true" : "false") << ",\n";
  out << "        \"exception\": " << JsonEscape(exception) << ",\n";
  out << "        \"is_done\": " << (isDone ? "true" : "false") << ",\n";
  out << "        \"nb_contours\": " << nbContours << ",\n";
  out << "        \"nb_surfaces\": " << nbSurfaces << ",\n";
  out << "        \"nb_faulty_contours\": " << nbFaultyContours << ",\n";
  out << "        \"faulty_contours\": [";
  for (Standard_Integer i = 1; i <= nbFaultyContours; ++i)
  {
    if (i != 1)
      out << ", ";
    out << mk.FaultyContour(i);
  }
  out << "],\n";
  out << "        \"nb_faulty_vertices\": " << nbFaultyVertices << ",\n";
  out << "        \"faulty_vertices\": [";
  for (Standard_Integer i = 1; i <= nbFaultyVertices; ++i)
  {
    const TopoDS_Vertex v = mk.FaultyVertex(i);
    const gp_Pnt p = VertexPoint(v);
    const Standard_Real tol = v.IsNull() ? 0.0 : BRep_Tool::Tolerance(v);
    if (i != 1)
      out << ", ";
    out << "{ \"iv\": " << i << ", \"p\": [";
    out << std::setprecision(17) << p.X() << ", " << p.Y() << ", " << p.Z();
    out << "], \"tol\": " << std::setprecision(17) << tol << " }";
  }
  out << "],\n";
  out << "        \"has_result\": " << (hasResult ? "true" : "false") << ",\n";
  out << "        \"generated_faces_from_selected_edges\": " << generatedFaces << ",\n";
  out << "        \"contours\": [\n";
  for (Standard_Integer ic = 1; ic <= nbContours; ++ic)
  {
    const Standard_Integer nbEdges = mk.NbEdges(ic);
    const Standard_Integer nbSurf = mk.NbSurf(ic);
    const ChFiDS_ErrorStatus st = mk.StripeStatus(ic);
    const Standard_Integer nbComputedSurfaces = mk.NbComputedSurfaces(ic);
    out << "          {";
    out << "\"ic\": " << ic << ", ";
    out << "\"nb_edges\": " << nbEdges << ", ";
    out << "\"edge_indices\": [";
    for (Standard_Integer ie = 1; ie <= nbEdges; ++ie)
    {
      if (ie != 1)
        out << ", ";
      out << EdgeIndexIn(inputEdges, mk.Edge(ic, ie));
    }
    out << "], ";
    out << "\"nb_surf\": " << nbSurf << ", ";
    out << "\"stripe_status\": " << static_cast<int>(st) << ", ";
    out << "\"stripe_status_name\": " << JsonEscape(StripeStatusName(st));
    out << ", \"nb_computed_surfaces\": " << nbComputedSurfaces << ", ";
    out << "\"computed_surface_types\": ";
    PrintSurfaceHistogram(out, ComputedSurfaceTypeHistogram(mk, ic));
    out << "}";
    if (ic != nbContours)
      out << ",";
    out << "\n";
  }
  out << "        ]\n";
  out << "      },\n";
  out << "      \"result\": {\n";
  out << "        \"is_valid\": " << (isValid ? "true" : "false") << ",\n";
  out << "        \"counts\": { \"solids\": " << counts.solids << ", \"faces\": " << counts.faces
      << ", \"edges\": " << counts.edges << ", \"vertices\": " << counts.vertices << " },\n";
  out << "        \"bbox\": ";
  PrintBBox(out, result);
  out << ",\n";
  out << "        \"surface_types\": ";
  PrintSurfaceHistogram(out, SurfaceTypeHistogram(result));
  out << "\n";
  out << "      },\n";
  out << "      \"partial_result\": {\n";
  out << "        \"has_bad_shape\": " << (hasResult ? "true" : "false") << ",\n";
  out << "        \"bad_shape_counts\": { \"solids\": " << badCounts.solids << ", \"faces\": " << badCounts.faces
      << ", \"edges\": " << badCounts.edges << ", \"vertices\": " << badCounts.vertices << " },\n";
  out << "        \"bad_shape_bbox\": ";
  PrintBBox(out, badShape);
  out << "\n";
  out << "      }\n";
  out << "    }" << (last ? "\n" : ",\n");
}

void EmitFilletCaseVarRadius(std::ostream& out,
                             const char* name,
                             const TopoDS_Shape& input,
                             const std::vector<TopoDS_Edge>& inputEdges,
                             const std::vector<TopoDS_Edge>& edgesToFillet,
                             const Standard_Real r1,
                             const Standard_Real r2,
                             const bool last)
{
  BRepFilletAPI_MakeFillet mk(input);
  for (const auto& e : edgesToFillet)
  {
    mk.Add(r1, r2, e);
  }

  bool didThrow = false;
  std::string exception;
  try
  {
    mk.Build();
  }
  catch (const Standard_Failure& ex)
  {
    didThrow = true;
    exception = ex.GetMessageString() == nullptr ? "" : ex.GetMessageString();
  }

  const Standard_Integer nbContours = mk.NbContours();
  const Standard_Integer nbFaultyContours = mk.NbFaultyContours();
  const Standard_Integer nbFaultyVertices = mk.NbFaultyVertices();
  const Standard_Boolean hasResult = mk.HasResult();
  const Standard_Boolean isDone = mk.IsDone();

  TopoDS_Shape result;
  if (isDone)
  {
    try
    {
      result = mk.Shape();
    }
    catch (const Standard_Failure& ex)
    {
      didThrow = true;
      if (exception.empty())
        exception = ex.GetMessageString() == nullptr ? "" : ex.GetMessageString();
    }
  }

  TopoDS_Shape badShape;
  if (hasResult)
  {
    try
    {
      badShape = mk.BadShape();
    }
    catch (const Standard_Failure&)
    {
    }
  }

  const ShapeCounts counts = Count(result);
  const ShapeCounts badCounts = Count(badShape);
  const Standard_Boolean isValid = result.IsNull() ? Standard_False : BRepCheck_Analyzer(result).IsValid();
  const Standard_Integer generatedFaces = isDone ? CountGeneratedFacesForEdges(mk, edgesToFillet) : 0;
  const Standard_Integer nbSurfaces = isDone ? mk.NbSurfaces() : 0;

  out << "    " << JsonEscape(name) << ": {\n";
  out << "      \"kind\": \"fillet\",\n";
  out << "      \"params\": { \"r1\": " << std::setprecision(17) << r1 << ", \"r2\": " << std::setprecision(17)
      << r2 << " },\n";
  out << "      \"selection\": { \"edges_added\": " << edgesToFillet.size() << " },\n";
  out << "      \"build\": {\n";
  out << "        \"did_throw\": " << (didThrow ? "true" : "false") << ",\n";
  out << "        \"exception\": " << JsonEscape(exception) << ",\n";
  out << "        \"is_done\": " << (isDone ? "true" : "false") << ",\n";
  out << "        \"nb_contours\": " << nbContours << ",\n";
  out << "        \"nb_surfaces\": " << nbSurfaces << ",\n";
  out << "        \"nb_faulty_contours\": " << nbFaultyContours << ",\n";
  out << "        \"faulty_contours\": [";
  for (Standard_Integer i = 1; i <= nbFaultyContours; ++i)
  {
    if (i != 1)
      out << ", ";
    out << mk.FaultyContour(i);
  }
  out << "],\n";
  out << "        \"nb_faulty_vertices\": " << nbFaultyVertices << ",\n";
  out << "        \"faulty_vertices\": [";
  for (Standard_Integer i = 1; i <= nbFaultyVertices; ++i)
  {
    const TopoDS_Vertex v = mk.FaultyVertex(i);
    const gp_Pnt p = VertexPoint(v);
    const Standard_Real tol = v.IsNull() ? 0.0 : BRep_Tool::Tolerance(v);
    if (i != 1)
      out << ", ";
    out << "{ \"iv\": " << i << ", \"p\": [";
    out << std::setprecision(17) << p.X() << ", " << p.Y() << ", " << p.Z();
    out << "], \"tol\": " << std::setprecision(17) << tol << " }";
  }
  out << "],\n";
  out << "        \"has_result\": " << (hasResult ? "true" : "false") << ",\n";
  out << "        \"generated_faces_from_selected_edges\": " << generatedFaces << ",\n";
  out << "        \"contours\": [\n";
  for (Standard_Integer ic = 1; ic <= nbContours; ++ic)
  {
    const Standard_Integer nbEdges = mk.NbEdges(ic);
    const Standard_Integer nbSurf = mk.NbSurf(ic);
    const ChFiDS_ErrorStatus st = mk.StripeStatus(ic);
    const Standard_Integer nbComputedSurfaces = mk.NbComputedSurfaces(ic);
    out << "          {";
    out << "\"ic\": " << ic << ", ";
    out << "\"nb_edges\": " << nbEdges << ", ";
    out << "\"edge_indices\": [";
    for (Standard_Integer ie = 1; ie <= nbEdges; ++ie)
    {
      if (ie != 1)
        out << ", ";
      out << EdgeIndexIn(inputEdges, mk.Edge(ic, ie));
    }
    out << "], ";
    out << "\"nb_surf\": " << nbSurf << ", ";
    out << "\"stripe_status\": " << static_cast<int>(st) << ", ";
    out << "\"stripe_status_name\": " << JsonEscape(StripeStatusName(st));
    out << ", \"nb_computed_surfaces\": " << nbComputedSurfaces << ", ";
    out << "\"computed_surface_types\": ";
    PrintSurfaceHistogram(out, ComputedSurfaceTypeHistogram(mk, ic));
    out << "}";
    if (ic != nbContours)
      out << ",";
    out << "\n";
  }
  out << "        ]\n";
  out << "      },\n";
  out << "      \"result\": {\n";
  out << "        \"is_valid\": " << (isValid ? "true" : "false") << ",\n";
  out << "        \"counts\": { \"solids\": " << counts.solids << ", \"faces\": " << counts.faces
      << ", \"edges\": " << counts.edges << ", \"vertices\": " << counts.vertices << " },\n";
  out << "        \"bbox\": ";
  PrintBBox(out, result);
  out << ",\n";
  out << "        \"surface_types\": ";
  PrintSurfaceHistogram(out, SurfaceTypeHistogram(result));
  out << "\n";
  out << "      },\n";
  out << "      \"partial_result\": {\n";
  out << "        \"has_bad_shape\": " << (hasResult ? "true" : "false") << ",\n";
  out << "        \"bad_shape_counts\": { \"solids\": " << badCounts.solids << ", \"faces\": " << badCounts.faces
      << ", \"edges\": " << badCounts.edges << ", \"vertices\": " << badCounts.vertices << " },\n";
  out << "        \"bad_shape_bbox\": ";
  PrintBBox(out, badShape);
  out << "\n";
  out << "      }\n";
  out << "    }" << (last ? "\n" : ",\n");
}

void EmitChamferCase(std::ostream& out,
                     const char* name,
                     const TopoDS_Shape& input,
                     const std::vector<TopoDS_Edge>& inputEdges,
                     const std::vector<TopoDS_Edge>& edgesToChamfer,
                     const Standard_Real dist,
                     const bool last)
{
  BRepFilletAPI_MakeChamfer mk(input);
  for (const auto& e : edgesToChamfer)
  {
    mk.Add(dist, e);
  }

  bool didThrow = false;
  std::string exception;
  try
  {
    mk.Build();
  }
  catch (const Standard_Failure& ex)
  {
    didThrow = true;
    exception = ex.GetMessageString() == nullptr ? "" : ex.GetMessageString();
  }

  const Standard_Integer nbContours = mk.NbContours();
  const Standard_Boolean isDone = mk.IsDone();

  TopoDS_Shape result;
  if (isDone)
  {
    try
    {
      result = mk.Shape();
    }
    catch (const Standard_Failure& ex)
    {
      didThrow = true;
      if (exception.empty())
        exception = ex.GetMessageString() == nullptr ? "" : ex.GetMessageString();
    }
  }

  const ShapeCounts counts = Count(result);
  const Standard_Boolean isValid = result.IsNull() ? Standard_False : BRepCheck_Analyzer(result).IsValid();
  const Standard_Integer generatedFaces = isDone ? CountGeneratedFacesForEdges(mk, edgesToChamfer) : 0;

  out << "    " << JsonEscape(name) << ": {\n";
  out << "      \"kind\": \"chamfer\",\n";
  out << "      \"params\": { \"dist\": " << std::setprecision(17) << dist << " },\n";
  out << "      \"selection\": { \"edges_added\": " << edgesToChamfer.size() << " },\n";
  out << "      \"build\": {\n";
  out << "        \"did_throw\": " << (didThrow ? "true" : "false") << ",\n";
  out << "        \"exception\": " << JsonEscape(exception) << ",\n";
  out << "        \"is_done\": " << (isDone ? "true" : "false") << ",\n";
  out << "        \"nb_contours\": " << nbContours << ",\n";
  out << "        \"nb_surfaces\": -1,\n";
  out << "        \"nb_faulty_contours\": -1,\n";
  out << "        \"faulty_contours\": [],\n";
  out << "        \"nb_faulty_vertices\": -1,\n";
  out << "        \"faulty_vertices\": [],\n";
  out << "        \"has_result\": false,\n";
  out << "        \"generated_faces_from_selected_edges\": " << generatedFaces << ",\n";
  out << "        \"contours\": [\n";
  for (Standard_Integer ic = 1; ic <= nbContours; ++ic)
  {
    const Standard_Integer nbEdges = mk.NbEdges(ic);
    const Standard_Integer nbSurf = mk.NbSurf(ic);
    out << "          {";
    out << "\"ic\": " << ic << ", ";
    out << "\"nb_edges\": " << nbEdges << ", ";
    out << "\"edge_indices\": [";
    for (Standard_Integer ie = 1; ie <= nbEdges; ++ie)
    {
      if (ie != 1)
        out << ", ";
      out << EdgeIndexIn(inputEdges, mk.Edge(ic, ie));
    }
    out << "], ";
    out << "\"nb_surf\": " << nbSurf << ", ";
    out << "\"stripe_status\": -1, ";
    out << "\"stripe_status_name\": \"N/A\"";
    out << ", \"nb_computed_surfaces\": -1, ";
    out << "\"computed_surface_types\": {}";
    out << "}";
    if (ic != nbContours)
      out << ",";
    out << "\n";
  }
  out << "        ]\n";
  out << "      },\n";
  out << "      \"result\": {\n";
  out << "        \"is_valid\": " << (isValid ? "true" : "false") << ",\n";
  out << "        \"counts\": { \"solids\": " << counts.solids << ", \"faces\": " << counts.faces
      << ", \"edges\": " << counts.edges << ", \"vertices\": " << counts.vertices << " },\n";
  out << "        \"bbox\": ";
  PrintBBox(out, result);
  out << ",\n";
  out << "        \"surface_types\": ";
  PrintSurfaceHistogram(out, SurfaceTypeHistogram(result));
  out << "\n";
  out << "      },\n";
  out << "      \"partial_result\": {\n";
  out << "        \"has_bad_shape\": false,\n";
  out << "        \"bad_shape_counts\": { \"solids\": 0, \"faces\": 0, \"edges\": 0, \"vertices\": 0 },\n";
  out << "        \"bad_shape_bbox\": { \"is_void\": true }\n";
  out << "      }\n";
  out << "    }" << (last ? "\n" : ",\n");
}
} // namespace

int main()
{
  std::cout.imbue(std::locale::classic());

  const char* versionStr = OCCT_Version_String_Extended();
  const char* devStr = OCCT_DevelopmentVersion();

  const TopoDS_Shape box = BRepPrimAPI_MakeBox(gp_Pnt(0.0, 0.0, 0.0), gp_Pnt(10.0, 10.0, 10.0)).Shape();

  TopTools_IndexedMapOfShape edgesMap;
  TopExp::MapShapes(box, TopAbs_EDGE, edgesMap);
  std::vector<TopoDS_Edge> edges;
  edges.reserve(edgesMap.Size());
  for (Standard_Integer i = 1; i <= edgesMap.Size(); ++i)
  {
    edges.push_back(TopoDS::Edge(edgesMap(i)));
  }

  std::vector<TopoDS_Edge> singleEdge;
  if (!edges.empty())
    singleEdge.push_back(edges.front());

  const TopoDS_Vertex vCorner = FindMinCornerVertex(box);
  const std::vector<TopoDS_Edge> cornerEdges = EdgesIncidentToVertex(box, vCorner);

  std::cout << "{\n";
  std::cout << "  \"meta\": {\n";
  std::cout << "    \"occt_version\": " << JsonEscape(versionStr == nullptr ? "" : versionStr) << ",\n";
  std::cout << "    \"occt_dev\": " << JsonEscape(devStr == nullptr ? "" : devStr) << "\n";
  std::cout << "  },\n";
  std::cout << "  \"inputs\": {\n";
  std::cout << "    \"box\": { \"bbox\": ";
  PrintBBox(std::cout, box);
  std::cout << ", \"counts\": { \"solids\": " << Count(box).solids << ", \"faces\": " << Count(box).faces
            << ", \"edges\": " << Count(box).edges << ", \"vertices\": " << Count(box).vertices << " } }\n";
  std::cout << "  },\n";
  std::cout << "  \"cases\": {\n";

  EmitFilletCase(std::cout, "single_edge_radius_1", box, edges, singleEdge, 1.0, false);
  EmitFilletCase(std::cout, "corner_3_edges_radius_1", box, edges, cornerEdges, 1.0, false);
  EmitFilletCaseVarRadius(std::cout, "single_edge_var_radius_0_5_to_2", box, edges, singleEdge, 0.5, 2.0, false);
  EmitFilletCase(std::cout, "single_edge_radius_100", box, edges, singleEdge, 100.0, false);
  EmitChamferCase(std::cout, "single_edge_chamfer_dist_1", box, edges, singleEdge, 1.0, false);
  EmitChamferCase(std::cout, "corner_3_edges_chamfer_dist_1", box, edges, cornerEdges, 1.0, true);

  std::cout << "  }\n";
  std::cout << "}\n";
  return 0;
}
